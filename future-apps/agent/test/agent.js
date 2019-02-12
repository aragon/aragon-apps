const Agent = artifacts.require('Agent')

const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const { hash: namehash } = require('eth-ens-namehash')
const ethutil = require('ethereumjs-util')
const getBalance = require('@aragon/test-helpers/balance')(web3)
const web3Call = require('@aragon/test-helpers/call')(web3)
const web3Sign = require('@aragon/test-helpers/sign')(web3)
const { encodeCallScript, EMPTY_SCRIPT } = require('@aragon/test-helpers/evmScript')
const assertEvent = require('@aragon/test-helpers/assertEvent')
const ethABI = new (require('web3-eth-abi').AbiCoder)()
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
const NO_SIG = '0x'

const ERC165_SUPPORT_INTERFACE_ID = '0x01ffc9a7'
const ERC165_SUPPORT_INVALID_ID = '0xffffffff'

contract('Agent app', (accounts) => {
  let daoFact, agentBase, acl, agent, agentId

  let ETH, ANY_ENTITY, APP_MANAGER_ROLE, EXECUTE_ROLE, RUN_SCRIPT_ROLE, ADD_PRESIGNED_HASH_ROLE, DESIGNATE_SIGNER_ROLE, ERC1271_INTERFACE_ID

  const root = accounts[0]

  const encodeFunctionCall = (contract, functionName, ...params) =>
    contract[functionName].request(...params).params[0]

  before(async () => {
    const kernelBase = await Kernel.new(true) // petrify immediately
    const aclBase = await ACL.new()
    const regFact = await EVMScriptRegistryFactory.new()
    daoFact = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)
    agentBase = await Agent.new()

    // Setup constants
    ANY_ENTITY = await aclBase.ANY_ENTITY()
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    EXECUTE_ROLE = await agentBase.EXECUTE_ROLE()
    RUN_SCRIPT_ROLE = await agentBase.RUN_SCRIPT_ROLE()
    ADD_PRESIGNED_HASH_ROLE = await agentBase.ADD_PRESIGNED_HASH_ROLE()
    DESIGNATE_SIGNER_ROLE = await agentBase.DESIGNATE_SIGNER_ROLE()
    ERC1271_INTERFACE_ID = await agentBase.ERC1271_INTERFACE_ID()

    const ethConstant = await EtherTokenConstantMock.new()
    ETH = await ethConstant.getETHConstant()
  })

  beforeEach(async () => {
    const r = await daoFact.newDAO(root)
    const dao = Kernel.at(getEvent(r, 'DeployDAO', 'dao'))
    acl = ACL.at(await dao.acl())

    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

    // agent
    const agentAppId = namehash('agent.aragonpm.test')

    const agentReceipt = await dao.newAppInstance(agentAppId, agentBase.address, '0x', false)
    const agentProxyAddress = getEvent(agentReceipt, 'NewAppProxy', 'proxy')
    agent = Agent.at(agentProxyAddress)

    await agent.initialize()
  })

  context('> Executing actions', () => {
    const [_, nonExecutor, executor] = accounts
    let executionTarget

    beforeEach(async () => {
      await acl.createPermission(executor, agent.address, EXECUTE_ROLE, root, { from: root })

      executionTarget = await ExecutionTarget.new()
    })

    it('can execute actions', async () => {
      const N = 1102

      assert.equal(await executionTarget.counter(), 0)

      const { to, data } = encodeFunctionCall(executionTarget, 'setCounter', N)
      const receipt = await agent.execute(to, 0, data, { from: executor })

      assert.equal(await executionTarget.counter(), N)
      assertEvent(receipt, 'Execute')
    })

    it('can execute actions without data', async () => {
      assert.equal(await executionTarget.counter(), 0)

      const noData = '0x'
      const receipt = await agent.execute(executionTarget.address, 0, noData, { from: executor })

      // Fallback just runs ExecutionTarget.execute()
      assert.equal(await executionTarget.counter(), 1)
      assertEvent(receipt, 'Execute')
    })

    it('fails to execute without permissions', async () => {
      const { to, data } = encodeFunctionCall(executionTarget, 'execute')

      await assertRevert(() =>
        agent.execute(to, 0, data, { from: nonExecutor })
      )
    })

    it('fails to execute when target is not a contract', async () => {
      const nonContract = accounts[8] // random account
      const randomData = '0x12345678'
      const noData = '0x'

      await assertRevert(() =>
        agent.execute(nonContract, 0, randomData, { from: executor })
      )

      await assertRevert(() =>
        agent.execute(nonContract, 0, noData, { from: executor })
      )
    })

    it('execution forwards success return data', async () => {
      assert.equal(await executionTarget.counter(), 0)

      const { to, data } = encodeFunctionCall(executionTarget, 'execute')

      // We make a call to easily get what data could be gotten inside the EVM
      // Contract -> Agent.execute -> Target.func (would allow Contract to have access to this data)
      const call = encodeFunctionCall(agent, 'execute', to, 0, data, { from: executor })
      const returnData = await web3Call(call)

      // ExecutionTarget.execute() increments the counter by 1
      assert.equal(ethABI.decodeParameter('uint256', returnData), 1)
    })

    it('it reverts if executed action reverts', async () => {
      // TODO: Check revert data was correctly forwarded
      // ganache currently doesn't support fetching this data

      const { to, data } = encodeFunctionCall(executionTarget, 'fail')

      await assertRevert(() =>
        agent.execute(to, 0, data, { from: executor })
      )
    })

    context('> With ETH:', () => {
      const depositValue = 3
      let to, data

      beforeEach(async () => {
        await agent.deposit(ETH, depositValue, { value: depositValue })

        const call = encodeFunctionCall(executionTarget, 'execute')
        to = call.to
        data = call.data

        assert.equal(await executionTarget.counter(), 0)
        assert.equal(await getBalance(executionTarget.address), 0)
        assert.equal(await getBalance(agent.address), depositValue)
      })

      it('can execute actions with ETH', async () => {
        await agent.execute(to, depositValue, data, { from: executor })

        assert.equal(await executionTarget.counter(), 1)
        assert.equal(await getBalance(executionTarget.address), depositValue)
        assert.equal(await getBalance(agent.address), 0)
      })

      it('fails to execute actions with more ETH than the agent owns', async () => {
        await assertRevert(() =>
          agent.execute(to, depositValue + 1, data, { from: executor })
        )
      })

      it('fails to execute when sending ETH and no data', async () => {
        await assertRevert(() =>
          agent.execute(to, depositValue, '0x', { from: executor })
        )
      })
    })
  })

  context('> Running scripts', () => {
    let executionTarget, script
    const [_, nonScriptRunner, scriptRunner] = accounts

    beforeEach(async () => {
      executionTarget = await ExecutionTarget.new()
      // prepare script
      const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
      script = encodeCallScript([action, action]) // perform action twice

      await acl.createPermission(scriptRunner, agent.address, RUN_SCRIPT_ROLE, root, { from: root })
    })

    it('runs script', async () => {
      assert.isTrue(await agent.canForward(scriptRunner, script))
      assert.equal(await executionTarget.counter(), 0)

      const receipt = await agent.forward(script, { from: scriptRunner })

      // Should execute ExecutionTarget.execute() twice
      assert.equal(await executionTarget.counter(), 2)
      assertEvent(receipt, 'ScriptResult')
    })

    it('fails to run script without permissions', async () => {
      assert.isFalse(await agent.canForward(nonScriptRunner, script))
      assert.equal(await executionTarget.counter(), 0)

      await assertRevert(() =>
        agent.forward(script, { from: nonScriptRunner })
      )
      assert.equal(await executionTarget.counter(), 0)
    })
  })

  context('> Signing messages', () => {
    const [_, nobody, presigner, signerDesignator] = accounts
    const HASH = web3.sha3('hash') // careful as it may encode the data in the same way as solidity before hashing

    const ERC1271_RETURN_VALID_SIGNATURE = '0x20c13b0b'
    const ERC1271_RETURN_INVALID_SIGNATURE = '0x00000000'

    const assertIsValidSignature = (isValid, erc1271Return) => {
      const expectedReturn =
        isValid
          ? ERC1271_RETURN_VALID_SIGNATURE
          : ERC1271_RETURN_INVALID_SIGNATURE

      assert.equal(expectedReturn, erc1271Return, `Expected signature to be ${isValid ? '' : 'in'}valid (returned ${erc1271Return})`)
    }

    beforeEach(async () => {
      await acl.createPermission(presigner, agent.address, ADD_PRESIGNED_HASH_ROLE, root, { from: root })
      await acl.createPermission(signerDesignator, agent.address, DESIGNATE_SIGNER_ROLE, root, { from: root })
    })

    it('complies with ERC165', async () => {
      assert.isTrue(await agent.supportsInterface(ERC165_SUPPORT_INTERFACE_ID))
      assert.isFalse(await agent.supportsInterface(ERC165_SUPPORT_INVALID_ID))
    })

    it('supports ERC1271 interface', async () => {
      assert.isTrue(await agent.supportsInterface(ERC1271_INTERFACE_ID))
    })

    it("doesn't support any other interface", async () => {
      assert.isFalse(await agent.supportsInterface('0x12345678'))
      assert.isFalse(await agent.supportsInterface('0x'))
    })

    it('presigns a hash', async () => {
      await agent.presignHash(HASH, { from: presigner })

      assertIsValidSignature(true, await agent.isValidSignature(HASH, NO_SIG))
    })

    it('fails to presign a hash if not authorized', async () => {
      await assertRevert(() =>
        agent.presignHash(HASH, { from: nobody })
      )
      assertIsValidSignature(false, await agent.isValidSignature(HASH, NO_SIG))
    })

    context('> Designated signer: EOAs', () => {
      let signer = accounts[7]

      const sign = async (hash, signer, useLegacySig = false, useInvalidV = false) => {
        let sig = (await web3Sign(signer, hash)).slice(2)

        let r = ethutil.toBuffer('0x' + sig.substring(0, 64))
        let s = ethutil.toBuffer('0x' + sig.substring(64, 128))
        let v = ethutil.toBuffer((useLegacySig ? 0 : 27) + parseInt(sig.substring(128, 130), 16))
        let mode = ethutil.toBuffer(1)

        if (useInvalidV) {
          v = ethutil.toBuffer(2) // force set an invalid v
        }

        const signature = '0x' + Buffer.concat([mode, v, r, s]).toString('hex')
        return signature
      }

      beforeEach(async () => {
        await agent.setDesignatedSigner(signer, { from: signerDesignator })
      })

      it('fails if setting itself as the designated signer', async () => {
        await assertRevert(async () =>
          await agent.setDesignatedSigner(agent.address, { from: signerDesignator })
        )
      })

      it('isValidSignature returns true to a valid signature', async () => {
        const signature = await sign(HASH, signer)
        assertIsValidSignature(true, await agent.isValidSignature(HASH, signature))
      })

      it('isValidSignature returns true to a valid signature with legacy version', async () => {
        const legacyVersionSignature = await sign(HASH, signer, true)
        assertIsValidSignature(true, await agent.isValidSignature(HASH, legacyVersionSignature))
      })

      it('isValidSignature returns false to an invalid signature', async () => {
        const badSignature = (await sign(HASH, signer)).slice(0, -2) // drop last byte
        assertIsValidSignature(false, await agent.isValidSignature(HASH, badSignature))
      })

      it('isValidSignature returns false to a signature with an invalid v', async () => {
        const invalidVersionSignature = await sign(HASH, signer, false, true)
        assertIsValidSignature(false, await agent.isValidSignature(HASH, invalidVersionSignature))
      })

      it('isValidSignature returns false to an unauthorized signer', async () => {
        const otherSignature = await sign(HASH, nobody)
        assertIsValidSignature(false, await agent.isValidSignature(HASH, otherSignature))
      })

      it('isValidSignature returns true to an invalid signature iff the hash was presigned', async () => {
        const badSignature = (await sign(HASH, signer)).substring(0, -2) // drop last byte
        assertIsValidSignature(false, await agent.isValidSignature(HASH, badSignature))

        // Now presign it
        await agent.presignHash(HASH, { from: presigner })
        assertIsValidSignature(true, await agent.isValidSignature(HASH, badSignature))
      })
    })

    context('> Designated signer: contracts', () => {
      const setDesignatedSignerContract = async (...params) => {
        const designatedSigner = await DesignatedSigner.new(...params)
        return agent.setDesignatedSigner(designatedSigner.address, { from: signerDesignator })
      }

      it('isValidSignature returns true if designated signer returns true', async () => {
        // true  - ERC165 interface compliant
        // true  - any sigs are valid
        // false - doesn't revert on checking sig
        // false - doesn't modify state on checking sig
        await setDesignatedSignerContract(true, true, false, false)

        assertIsValidSignature(true, await agent.isValidSignature(HASH, NO_SIG))
      })

      it('isValidSignature returns false if designated signer returns false', async () => {
        // true  - ERC165 interface compliant
        // false - sigs are invalid
        // false - doesn't revert on checking sig
        // false - doesn't modify state on checking sig
        await setDesignatedSignerContract(true, false, false, false)

        // Signature fails check
        assertIsValidSignature(false, await agent.isValidSignature(HASH, NO_SIG))
      })

      it('isValidSignature returns false if designated signer doesnt support the interface', async () => {
        // false - not ERC165 interface compliant
        // true  - any sigs are valid
        // false - doesn't revert on checking sig
        // false - doesn't modify state on checking sig
        await setDesignatedSignerContract(false, true, false, false)

        // Requires ERC165 compliance before checking isValidSignature
        assertIsValidSignature(false, await agent.isValidSignature(HASH, NO_SIG))
      })

      it('isValidSignature returns false if designated signer reverts', async () => {
        // true  - ERC165 interface compliant
        // true  - any sigs are valid
        // true  - reverts on checking sig
        // false - doesn't modify state on checking sig
        await setDesignatedSignerContract(true, true, true, false)

        // Reverts on checking
        assertIsValidSignature(false, await agent.isValidSignature(HASH, NO_SIG))
      })

      it('isValidSignature returns false if designated signer attempts to modify state', async () => {
        // true  - ERC165 interface compliant
        // true  - any sigs are valid
        // false - doesn't revert on checking sig
        // true  - modifies state on checking sig
        await setDesignatedSignerContract(true, true, false, true)

        // Checking costs too much gas
        assertIsValidSignature(false, await agent.isValidSignature(HASH, NO_SIG))
      })
    })
  })
})
