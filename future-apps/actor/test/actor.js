const Actor = artifacts.require('Actor')

const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const { hash: namehash } = require('eth-ens-namehash')
const ethutil = require('ethereumjs-util')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const web3Call = require('@aragon/test-helpers/call')(web3)
const web3Sign = require('@aragon/test-helpers/sign')(web3)
const { encodeCallScript, EMPTY_SCRIPT } = require('@aragon/test-helpers/evmScript')
const assertEvent = require('@aragon/test-helpers/assertEvent')
const ethABI = require('web3-eth-abi')
const getEvent = (receipt, event, arg) => { return receipt.logs.filter(l => l.event == event)[0].args[arg] }

const ACL = artifacts.require('ACL')
const AppProxyUpgradeable = artifacts.require('AppProxyUpgradeable')
const EVMScriptRegistryFactory = artifacts.require('EVMScriptRegistryFactory')
const DAOFactory = artifacts.require('DAOFactory')
const Kernel = artifacts.require('Kernel')
const KernelProxy = artifacts.require('KernelProxy')

const EtherTokenConstantMock = artifacts.require('EtherTokenConstantMock')
const KernelDepositableMock = artifacts.require('KernelDepositableMock')

const ExecutionTarget = artifacts.require('ExecutionTarget')
const DesignatedSigner = artifacts.require('DesignatedSigner')

const NULL_ADDRESS = '0x00'

contract('Actor app', (accounts) => {
  let daoFact, actorBase, acl, actor, actorId

  let ETH, ANY_ENTITY, APP_MANAGER_ROLE, EXECUTE_ROLE, RUN_SCRIPT_ROLE, PRESIGN_HASH_ROLE, DESIGNATE_SIGNER_ROLE, ISVALIDSIG_INTERFACE_ID

  const root = accounts[0]

  const encodeFunctionCall = (contract, functionName, ...params) =>
    contract[functionName].request(...params).params[0]

  before(async () => {
    const kernelBase = await Kernel.new(true) // petrify immediately
    const aclBase = await ACL.new()
    const regFact = await EVMScriptRegistryFactory.new()
    daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)
    actorBase = await Actor.new()

    // Setup constants
    ANY_ENTITY = await aclBase.ANY_ENTITY()
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    EXECUTE_ROLE = await actorBase.EXECUTE_ROLE()
    RUN_SCRIPT_ROLE = await actorBase.RUN_SCRIPT_ROLE()
    PRESIGN_HASH_ROLE = await actorBase.PRESIGN_HASH_ROLE()
    DESIGNATE_SIGNER_ROLE = await actorBase.DESIGNATE_SIGNER_ROLE()
    ISVALIDSIG_INTERFACE_ID = await actorBase.ISVALIDSIG_INTERFACE_ID()

    const ethConstant = await EtherTokenConstantMock.new()
    ETH = await ethConstant.getETHConstant()
  })

  beforeEach(async () => {
    const r = await daoFact.newDAO(root)
    const dao = Kernel.at(getEvent(r, 'DeployDAO', 'dao'))
    acl = ACL.at(await dao.acl())

    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

    // actor
    actorAppId = namehash('actor.aragonpm.test')

    const actorReceipt = await dao.newAppInstance(actorAppId, actorBase.address, '0x', false)
    const actorProxyAddress = getEvent(actorReceipt, 'NewAppProxy', 'proxy')
    actor = Actor.at(actorProxyAddress)

    await actor.initialize()
  })

  context('executing actions', () => {
    const [nonExecutor, executor] = accounts
    let executionTarget

    beforeEach(async () => {
      await acl.createPermission(executor, actor.address, EXECUTE_ROLE, root, { from: root })

      executionTarget = await ExecutionTarget.new()
    })

    it('can execute actions', async () => {
      const N = 1102

      assert.equal(await executionTarget.counter(), 0)

      const { to, data } = encodeFunctionCall(executionTarget, 'setCounter', N)
      const receipt = await actor.execute(to, 0, data, { from: executor })

      assert.equal(await executionTarget.counter(), N)
      assertEvent(receipt, 'Execute')
    })

    it('fails to execute without permissions', async () => {
      const { to, data } = encodeFunctionCall(executionTarget, 'execute')

      await assertRevert(() =>
        actor.execute(to, 0, data, { from: nonExecutor })
      )
    })

    it('fails to execute when target is not a contract', async () => {
      const nonContract = accounts[8] // random account
      const randomData = '0x12345678'
      const noData = '0x'

      await assertRevert(() =>
        actor.execute(nonContract, 0, randomData, { from: executor })
      )

      await assertRevert(() =>
        actor.execute(nonContract, 0, noData, { from: executor })
      )
    })

    it('execution forwards success return data', async () => {
      const { to, data } = encodeFunctionCall(executionTarget, 'execute')

      // We make a call to easily get what data could be gotten inside the EVM
      // Contract -> Actor.execute -> Target.func (would allow Contract to have access to this data)
      assert.equal(await executionTarget.counter(), 0)
      const call = encodeFunctionCall(actor, 'execute', to, 0, data, { from: executor })
      const returnData = await web3Call(call)

      assert.equal(ethABI.decodeParameter('uint256', returnData), 1)
    })

    it('it reverts if executed action reverts', async () => {
      // TODO: Check revert data was correctly forwarded
      // ganache currently doesn't support fetching this data

      const { to, data } = encodeFunctionCall(executionTarget, 'fail')

      await assertRevert(() =>
        actor.execute(to, 0, data, { from: executor })
      )
    })

    context('with ETH:', () => {
      const depositValue = 3
      let to, data

      beforeEach(async () => {
        await actor.deposit(ETH, depositValue, { value: depositValue })

        const call = encodeFunctionCall(executionTarget, 'execute')
        to = call.to
        data = call.data

        assert.equal(await executionTarget.counter(), 0)
        assert.equal(await getBalance(executionTarget.address), 0)
        assert.equal(await getBalance(actor.address), depositValue)
      })

      it('can execute actions with ETH', async () => {
        await actor.execute(to, depositValue, data, { from: executor })

        assert.equal(await executionTarget.counter(), 1)
        assert.equal(await getBalance(executionTarget.address), depositValue)
        assert.equal(await getBalance(actor.address), 0)
      })

      it('fails to execute actions with more ETH than the actor owns', async () => {
        await assertRevert(() =>
          actor.execute(to, depositValue + 1, data, { from: executor })
        )
      })

      it('fails to execute when sending ETH and no data', async () => {
        await assertRevert(() =>
          actor.execute(to, depositValue, '0x', { from: executor })
        )
      })
    })
  })

  context('running scripts', () => {
    let executionTarget, script
    const [nonScriptRunner, scriptRunner] = accounts

    beforeEach(async () => {
      executionTarget = await ExecutionTarget.new()
      // prepare script
      const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
      script = encodeCallScript([action, action]) // perform action twice

      await acl.createPermission(scriptRunner, actor.address, RUN_SCRIPT_ROLE, root, { from: root })
    })

    it('runs script', async () => {
      assert.isTrue(await actor.canForward(scriptRunner, script))
      assert.equal(await executionTarget.counter(), 0)

      const receipt = await actor.forward(script, { from: scriptRunner })

      assert.equal(await executionTarget.counter(), 2)
      assertEvent(receipt, 'ScriptResult')
    })

    it('fails to run script without permissions', async () => {
      assert.isFalse(await actor.canForward(nonScriptRunner, script))

      await assertRevert(() =>
        actor.forward(script, { from: nonScriptRunner })
      )
    })
  })

  context('signing messages', () => {
    const [nobody, presigner, signerDesignator] = accounts
    let HASH
    const NO_SIG = '0x'

    beforeEach(async () => {
      HASH = web3.sha3('hash') // careful as it may encode the data in the same way as solidity before hashing

      await acl.createPermission(presigner, actor.address, PRESIGN_HASH_ROLE, root, { from: root })
      await acl.createPermission(signerDesignator, actor.address, DESIGNATE_SIGNER_ROLE, root, { from: root })
    })

    it('supports ERC1271 interface', async () => {
      assert.isTrue(await actor.supportsInterface(ISVALIDSIG_INTERFACE_ID))
    })

    it('doesnt support any other interface', async () => {
      assert.isFalse(await actor.supportsInterface('0x12345678'))
      assert.isFalse(await actor.supportsInterface('0x'))
    })

    it('presigns a hash', async () => {
      await actor.presignHash(HASH, { from: presigner })

      assert.isTrue(await actor.isValidSignature(HASH, NO_SIG))
    })

    it('fails to presign a hash if not authorized', async () => {
      await assertRevert(() =>
        actor.presignHash(HASH, { from: nobody })
      )
    })

    context('designated signer: EOAs', () => {
      let signer = accounts[7]

      const sign = async (hash, signer) => {
        let sig = (await web3Sign(signer, hash)).slice(2)

        let r = ethutil.toBuffer('0x' + sig.substring(0, 64))
        let s = ethutil.toBuffer('0x' + sig.substring(64, 128))
        let v = ethutil.toBuffer(parseInt(sig.substring(128, 130), 16) + 27)
        let mode = ethutil.toBuffer(1)

        let signature = '0x' + Buffer.concat([mode, v, r, s]).toString('hex')
        return signature
      }

      beforeEach(async () => {
        await actor.setDesignatedSigner(signer, { from: signerDesignator })
      })

      it('isValidSignature returns true to a valid signature', async () => {
        const signature = await sign(HASH, signer)
        assert.isTrue(await actor.isValidSignature(HASH, signature))
      })

      it('isValidSignature returns false to an invalid signature', async () => {
        const badSignature = (await sign(HASH, signer)).substring(0, 132) // drop last byte
        assert.isFalse(await actor.isValidSignature(HASH, badSignature))
      })

      it('isValidSignature returns false to an unauthorized signer', async () => {
        const otherSignature = await sign(HASH, nobody)
        assert.isFalse(await actor.isValidSignature(HASH, otherSignature))
      })

      it('isValidSignature returns true to an invalid signature iff the hash was presigned', async () => {
        const badSignature = (await sign(HASH, signer)).substring(0, 132) // drop last byte
        await actor.presignHash(HASH, { from: presigner })
        assert.isTrue(await actor.isValidSignature(HASH, badSignature))
      })
    })

    context('designated signer: contracts', () => {
      const setDesignatedSignerContract = async (...params) => {
        const designatedSigner = await DesignatedSigner.new(...params)
        return actor.setDesignatedSigner(designatedSigner.address, { from: signerDesignator })
      }

      it('isValidSignature returns true if designated signer returns true', async () => {
        // interface compliance, sig is valid, doesn't revert and doesn't modify state
        await setDesignatedSignerContract(true, true, false, false)

        assert.isTrue(await actor.isValidSignature(HASH, NO_SIG))
      })

      it('isValidSignature returns false if designated signer returns false', async () => {
        // interface compliance, sig is invalid, doesn't revert and doesn't modify state
        await setDesignatedSignerContract(true, false, false, false)

        assert.isFalse(await actor.isValidSignature(HASH, NO_SIG))
      })

      it('isValidSignature returns false if designated signer doesnt support the interface', async () => {
        // no interface compliance, sig is valid, doesn't revert and doesn't modify state
        await setDesignatedSignerContract(false, true, false, false)

        assert.isFalse(await actor.isValidSignature(HASH, NO_SIG))
      })

      it('isValidSignature returns false if designated signer reverts', async () => {
        // no interface compliance, sig is valid, reverts and doesn't modify state
        await setDesignatedSignerContract(true, true, true, false)

        assert.isFalse(await actor.isValidSignature(HASH, NO_SIG))
      })

      it('isValidSignature returns false if designated signer attempts to modify state', async () => {
        // no interface compliance, sig is valid, doesn't revert and modifies state
        await setDesignatedSignerContract(true, true, false, true)

        assert.isFalse(await actor.isValidSignature(HASH, NO_SIG))
      })
    })
  })
})
