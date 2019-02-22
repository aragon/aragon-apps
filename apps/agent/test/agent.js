const Agent = artifacts.require('Agent')

const { assertRevert, assertInvalidOpcode } = require('@aragon/test-helpers/assertThrow')
const { hash: namehash } = require('eth-ens-namehash')
const ethUtil = require('ethereumjs-util')
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
const DestinationMock = artifacts.require('DestinationMock')
const KernelDepositableMock = artifacts.require('KernelDepositableMock')

const ExecutionTarget = artifacts.require('ExecutionTarget')
const DesignatedSigner = artifacts.require('DesignatedSigner')

const NULL_ADDRESS = '0x00'
const NO_SIG = '0x'

const ERC165_SUPPORT_INTERFACE_ID = '0x01ffc9a7'
const ERC165_SUPPORT_INVALID_ID = '0xffffffff'

contract('Agent app', (accounts) => {
  let daoFact, agentBase, dao, acl, agent, agentAppId

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
    dao = Kernel.at(getEvent(r, 'DeployDAO', 'dao'))
    acl = ACL.at(await dao.acl())

    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

    // agent
    agentAppId = namehash('agent.aragonpm.test')

    const agentReceipt = await dao.newAppInstance(agentAppId, agentBase.address, '0x', false)
    const agentProxyAddress = getEvent(agentReceipt, 'NewAppProxy', 'proxy')
    agent = Agent.at(agentProxyAddress)

    await agent.initialize()
  })

  context('> Executing actions', () => {
    const [_, nonExecutor, executor] = accounts
    let executionTarget

    for (const depositAmount of [0, 3]) {
      context(depositAmount ? '> With ETH' : '> Without ETH', () => {
        beforeEach(async () => {
          await acl.createPermission(executor, agent.address, EXECUTE_ROLE, root, { from: root })

          executionTarget = await ExecutionTarget.new()
          assert.equal(await executionTarget.counter(), 0, 'expected starting counter of execution target to be be 0')
          assert.equal((await getBalance(executionTarget.address)).toString(), 0, 'expected starting balance of execution target to be be 0')

          if (depositAmount) {
            await agent.deposit(ETH, depositAmount, { value: depositAmount })
          }
          assert.equal((await getBalance(agent.address)).toString(), depositAmount, `expected starting balance of agent to be ${depositAmount}`)
        })

        it('can execute actions', async () => {
          const N = 1102

          const data = executionTarget.contract.setCounter.getData(N)
          const receipt = await agent.execute(executionTarget.address, depositAmount, data, { from: executor })

          assertEvent(receipt, 'Execute')
          assert.equal(await executionTarget.counter(), N, `expected counter to be ${N}`)
          assert.equal((await getBalance(executionTarget.address)).toString(), depositAmount, 'expected ending balance of execution target to be correct')
          assert.equal((await getBalance(agent.address)).toString(), 0, 'expected ending balance of agent at end to be 0')
        })

        it('can execute actions without data', async () => {
          const noData = '0x'
          const receipt = await agent.execute(executionTarget.address, depositAmount, noData, { from: executor })

          assertEvent(receipt, 'Execute')
          // Fallback just runs ExecutionTarget.execute()
          assert.equal(await executionTarget.counter(), 1, 'expected counter to be 1')
          assert.equal((await getBalance(executionTarget.address)).toString(), depositAmount, 'expected ending balance of execution target to be correct')
          assert.equal((await getBalance(agent.address)).toString(), 0, 'expected ending balance of agent at end to be 0')
        })

        it('can execute cheap fallback actions', async () => {
          const cheapFallbackTarget = await DestinationMock.new(false)
          const noData = '0x'
          const receipt = await agent.execute(cheapFallbackTarget.address, depositAmount, noData, { from: executor })

          assertEvent(receipt, 'Execute')
          assert.equal((await getBalance(cheapFallbackTarget.address)).toString(), depositAmount, 'expected ending balance of execution target to be correct')
          assert.equal((await getBalance(agent.address)).toString(), 0, 'expected ending balance of agent at end to be 0')
        })

        it('can execute expensive fallback actions', async () => {
          const expensiveFallbackTarget = await DestinationMock.new(true)
          assert.equal(await expensiveFallbackTarget.counter(), 0)

          const noData = '0x'
          const receipt = await agent.execute(expensiveFallbackTarget.address, depositAmount, noData, { from: executor })

          assertEvent(receipt, 'Execute')
          // Fallback increments counter
          assert.equal(await expensiveFallbackTarget.counter(), 1)
          assert.equal((await getBalance(expensiveFallbackTarget.address)).toString(), depositAmount, 'expected ending balance of execution target to be correct')
          assert.equal((await getBalance(agent.address)).toString(), 0, 'expected ending balance of agent at end to be 0')
        })

        it('can execute with data when target is not a contract', async () => {
          const nonContract = accounts[8] // random account
          const nonContractBalance = await getBalance(nonContract)
          const randomData = '0x12345678'

          const receipt = await agent.execute(nonContract, depositAmount, randomData, { from: executor })

          assertEvent(receipt, 'Execute')
          assert.equal((await getBalance(nonContract)).toString(), nonContractBalance.add(depositAmount).toString(), 'expected ending balance of non-contract to be correct')
          assert.equal((await getBalance(agent.address)).toString(), 0, 'expected ending balance of agent at end to be 0')
        })

        it('can execute without data when target is not a contract', async () => {
          const nonContract = accounts[8] // random account
          const nonContractBalance = await getBalance(nonContract)
          const noData = '0x'

          const receipt = await agent.execute(nonContract, depositAmount, noData, { from: executor })

          assertEvent(receipt, 'Execute')
          assert.equal((await getBalance(nonContract)).toString(), nonContractBalance.add(depositAmount).toString(), 'expected ending balance of non-contract to be correct')
          assert.equal((await getBalance(agent.address)).toString(), 0, 'expected ending balance of agent at end to be 0')
        })

        it('fails to execute without permissions', async () => {
          const data = executionTarget.contract.execute.getData()

          await assertRevert(() =>
            agent.execute(executionTarget.address, depositAmount, data, { from: nonExecutor })
          )
        })

        it('fails to execute actions with more ETH than the agent owns', async () => {
          const data = executionTarget.contract.execute.getData()

          await assertRevert(() =>
            agent.execute(executionTarget.address, depositAmount + 1, data, { from: executor })
          )
        })

        it('execution forwards success return data', async () => {
          const { to, data } = encodeFunctionCall(executionTarget, 'execute')

          // We make a call to easily get what data could be gotten inside the EVM
          // Contract -> agent.execute -> Target.func (would allow Contract to have access to this data)
          const call = encodeFunctionCall(agent, 'execute', to, depositAmount, data, { from: executor })
          const returnData = await web3Call(call)

          // ExecutionTarget.execute() increments the counter by 1
          assert.equal(ethABI.decodeParameter('uint256', returnData), 1)
        })

        it('it reverts if executed action reverts', async () => {
          // TODO: Check revert data was correctly forwarded
          // ganache currently doesn't support fetching this data

          const data = executionTarget.contract.fail.getData()
          await assertRevert(() =>
            agent.execute(executionTarget.address, depositAmount, data, { from: executor })
          )
        })

        context('depending on the sig ACL param', () => {
          const [ granteeEqualToSig, granteeUnequalToSig ] = accounts.slice(6) // random slice from accounts

          beforeEach(async () => {
            const sig = executionTarget.contract.setCounter.getData(1).slice(2, 10)
            const argId = '0x02' // arg 2
            const equalOp = '01'
            const nonEqualOp = '02'
            const value = `${'00'.repeat(30 - 4)}${sig}`

            const equalParam = new web3.BigNumber(`${argId}${equalOp}${value}`)
            const nonEqualParam = new web3.BigNumber(`${argId}${nonEqualOp}${value}`)

            await acl.grantPermissionP(granteeEqualToSig, agent.address, EXECUTE_ROLE, [equalParam], { from: root })
            await acl.grantPermissionP(granteeUnequalToSig, agent.address, EXECUTE_ROLE, [nonEqualParam], { from: root })
          })

          it('equal: can execute if the signature matches', async () => {
            const N = 1102

            const data = executionTarget.contract.setCounter.getData(N)
            const receipt = await agent.execute(executionTarget.address, depositAmount, data, { from: granteeEqualToSig })

            assertEvent(receipt, 'Execute')
            assert.equal(await executionTarget.counter(), N, `expected counter to be ${N}`)
            assert.equal((await getBalance(executionTarget.address)).toString(), depositAmount, 'expected ending balance of execution target to be correct')
            assert.equal((await getBalance(agent.address)).toString(), 0, 'expected ending balance of agent at end to be 0')
          })

          it('not equal: can execute if the signature doesn\'t match', async () => {
            const data = executionTarget.contract.execute.getData()
            const receipt = await agent.execute(executionTarget.address, depositAmount, data, { from: granteeUnequalToSig })

            assertEvent(receipt, 'Execute')
            assert.equal(await executionTarget.counter(), 1, `expected counter to be ${1}`)
            assert.equal((await getBalance(executionTarget.address)).toString(), depositAmount, 'expected ending balance of execution target to be correct')
            assert.equal((await getBalance(agent.address)).toString(), 0, 'expected ending balance of agent at end to be 0')
          })

          it('equal: fails to execute if signature doesn\'t match', async () => {
            const data = executionTarget.contract.execute.getData()

            await assertRevert(() =>
              agent.execute(executionTarget.address, depositAmount, data, { from: granteeEqualToSig })
            )
          })

          it('not equal: fails to execute if the signature matches', async () => {
            const N = 1102

            const data = executionTarget.contract.setCounter.getData(N)
            await assertRevert(() =>
              agent.execute(executionTarget.address, depositAmount, data, { from: granteeUnequalToSig })
            )
          })
        })
      })
    }
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

    const SIGNATURE_MODES = {
      Invalid: '0x00',
      EIP712:  '0x01',
      EthSign: '0x02',
      ERC1271: '0x03',
      NMode:   '0x04',
    }

    const ERC1271_RETURN_VALID_SIGNATURE = '0x20c13b0b'
    const ERC1271_RETURN_INVALID_SIGNATURE = '0x00000000'

    const assertIsValidSignature = (isValid, erc1271Return) => {
      const expectedReturn =
        isValid
          ? ERC1271_RETURN_VALID_SIGNATURE
          : ERC1271_RETURN_INVALID_SIGNATURE

      assert.equal(erc1271Return, expectedReturn, `Expected signature to be ${isValid ? '' : 'in'}valid (returned ${erc1271Return})`)
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

    it('doesn\'t support any other interface', async () => {
      assert.isFalse(await agent.supportsInterface('0x12345678'))
      assert.isFalse(await agent.supportsInterface('0x'))
    })

    it('isValidSignature returns false if there is not designated signer and hash isn\'t presigned', async () => {
      assertIsValidSignature(false, await agent.isValidSignature(HASH, NO_SIG))
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

    context('> Designated signer', () => {
      const ethSign = async (hash, signer) => {
        const packedSig = await web3Sign(signer, hash)

        return {
          r: ethUtil.toBuffer('0x' + packedSig.substring(2, 66)),
          s: ethUtil.toBuffer('0x' + packedSig.substring(66, 130)),
          v: parseInt(packedSig.substring(130, 132), 16) + 27,
          mode: ethUtil.toBuffer(SIGNATURE_MODES.EthSign)
        }
      }

      const eip712Sign = async (hash, key) => ({
          mode: ethUtil.toBuffer(SIGNATURE_MODES.EIP712),
          ...ethUtil.ecsign(
            Buffer.from(hash.slice(2), 'hex'),
            Buffer.from(key, 'hex')
          )
      })

      const signFunctionGenerator = (signFunction, signatureModifier) => (
        async (hash, signerOrKey, useLegacySig = false, useInvalidV = false) => {
          const sig = await signFunction(hash, signerOrKey)
          const v =
            useInvalidV
            ? ethUtil.toBuffer(2) // force set an invalid v
            : ethUtil.toBuffer(sig.v - (useLegacySig ? 0 : 27))

          const signature = '0x' + Buffer.concat([sig.mode, sig.r, sig.s, v]).toString('hex')
          return signatureModifier(signature)
        }
      )

      const addERC1271ModePrefix = (signature) =>
        `${SIGNATURE_MODES.ERC1271}${signature.slice(2)}`

      const createChildAgentGenerator = (designatedSigner) =>
        async () => {
          const agentReceipt = await dao.newAppInstance(agentAppId, agentBase.address, '0x', false)
          const agentProxyAddress = getEvent(agentReceipt, 'NewAppProxy', 'proxy')
          const childAgent = Agent.at(agentProxyAddress)

          await childAgent.initialize()
          await acl.createPermission(signerDesignator, childAgent.address, DESIGNATE_SIGNER_ROLE, root, { from: root })
          await childAgent.setDesignatedSigner(designatedSigner, { from: signerDesignator })

          return childAgent.address
        }

      const directSignatureTests = [
        {
          name: 'EIP712',
          signFunction: eip712Sign,
          getSigner: () => '0x93070b307c373D7f9344859E909e3EEeF6E4Fd5a',
          signerOrKey: '11bc31e7fef59610dfd6f95d2f78d2396c7b5477e4a9a54d72d9c1b76930e5c1',
          notSignerOrKey: '7224b5bc510e01f75b10e3b6d6c903861ca91adb95a26406d1603e2d28a29e7f',
        },
        {
          name: 'EthSign',
          signFunction: ethSign,
          getSigner: () => accounts[7],
          signerOrKey: accounts[7],
          notSignerOrKey: accounts[8]
        },
      ]

      const wrappedSignatureTests = directSignatureTests.map(signatureTest => ({
        ...signatureTest,
        name: `ERC1271 -> ${signatureTest.name}`,
        signatureModifier: addERC1271ModePrefix,
        getSigner: createChildAgentGenerator(signatureTest.getSigner()),
      }))

      const signatureTests = directSignatureTests.concat(wrappedSignatureTests)

      for (const {
        name,
        signFunction,
        getSigner,
        signerOrKey,
        notSignerOrKey,
        signatureModifier = sig => sig // defaults to identity function (returns input)
      } of signatureTests) {
        const sign = signFunctionGenerator(signFunction, signatureModifier)

        context(`> Signature mode: ${name}`, () => {
          beforeEach(async () => {
            const signer = await getSigner()
            await agent.setDesignatedSigner(signer, { from: signerDesignator })
          })

          it('isValidSignature returns true to a valid signature', async () => {
            const signature = await sign(HASH, signerOrKey)
            assertIsValidSignature(true, await agent.isValidSignature(HASH, signature))
          })

          it('isValidSignature returns true to a valid signature with legacy version', async () => {
            const legacyVersionSignature = await sign(HASH, signerOrKey, true)
            assertIsValidSignature(true, await agent.isValidSignature(HASH, legacyVersionSignature))
          })

          it('isValidSignature returns false to an invalid signature', async () => {
            const badSignature = (await sign(HASH, signerOrKey)).slice(0, -2) // drop last byte
            assertIsValidSignature(false, await agent.isValidSignature(HASH, badSignature))
          })

          it('isValidSignature returns false to a signature with an invalid v', async () => {
            const invalidVersionSignature = await sign(HASH, signerOrKey, false, true)
            assertIsValidSignature(false, await agent.isValidSignature(HASH, invalidVersionSignature))
          })

          it('isValidSignature returns false to an unauthorized signer', async () => {
            const otherSignature = await sign(HASH, notSignerOrKey)
            assertIsValidSignature(false, await agent.isValidSignature(HASH, otherSignature))
          })
        })
      }

      context('> Signature mode: ERC1271', () => {
        const ERC1271_SIG = SIGNATURE_MODES.ERC1271

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

          assertIsValidSignature(true, await agent.isValidSignature(HASH, ERC1271_SIG))
        })

        it('isValidSignature returns false if designated signer returns false', async () => {
          // true  - ERC165 interface compliant
          // false - sigs are invalid
          // false - doesn't revert on checking sig
          // false - doesn't modify state on checking sig
          await setDesignatedSignerContract(true, false, false, false)

          // Signature fails check
          assertIsValidSignature(false, await agent.isValidSignature(HASH, ERC1271_SIG))
        })

        it('isValidSignature returns true even if the designated signer doesnt support the interface', async () => {
          // false - not ERC165 interface compliant
          // true  - any sigs are valid
          // false - doesn't revert on checking sig
          // false - doesn't modify state on checking sig
          await setDesignatedSignerContract(false, true, false, false)

          assertIsValidSignature(true, await agent.isValidSignature(HASH, ERC1271_SIG))
        })

        it('isValidSignature returns false if designated signer reverts', async () => {
          // true  - ERC165 interface compliant
          // true  - any sigs are valid
          // true  - reverts on checking sig
          // false - doesn't modify state on checking sig
          await setDesignatedSignerContract(true, true, true, false)

          // Reverts on checking
          assertIsValidSignature(false, await agent.isValidSignature(HASH, ERC1271_SIG))
        })

        it('isValidSignature returns false if designated signer attempts to modify state', async () => {
          // true  - ERC165 interface compliant
          // true  - any sigs are valid
          // false - doesn't revert on checking sig
          // true  - modifies state on checking sig
          await setDesignatedSignerContract(true, true, false, true)

          // Checking costs too much gas
          assertIsValidSignature(false, await agent.isValidSignature(HASH, ERC1271_SIG))
        })
      })

      context(`> Signature mode: invalid modes`, () => {
        const randomAccount = accounts[9]

        beforeEach(async () => {
          await agent.setDesignatedSigner(randomAccount, { from: signerDesignator })
        })

        it('isValidSignature returns false to an empty signature', async () => {
          const emptySig = '0x'
          assertIsValidSignature(false, await agent.isValidSignature(HASH, emptySig))
        })

        it('isValidSignature returns false to an invalid mode signature', async () => {
          const invalidSignature = SIGNATURE_MODES.Invalid
          assertIsValidSignature(false, await agent.isValidSignature(HASH, invalidSignature))
        })

        it('isValidSignature returns false to an unspecified mode signature', async () => {
          const unspecifiedSignature = SIGNATURE_MODES.NMode
          assertIsValidSignature(false, await agent.isValidSignature(HASH, unspecifiedSignature))
        })

        it('isValidSignature returns true to an invalid signature iff the hash was presigned', async () => {
          const invalidSignature = SIGNATURE_MODES.Invalid
          assertIsValidSignature(false, await agent.isValidSignature(HASH, invalidSignature))

          // Now presign it
          await agent.presignHash(HASH, { from: presigner })
          assertIsValidSignature(true, await agent.isValidSignature(HASH, invalidSignature))
        })
      })
    })
  })
})
