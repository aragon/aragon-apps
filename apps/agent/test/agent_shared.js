const ERRORS = require('./helpers/errors')
const ethABI = require('web3-eth-abi')
const ethUtil = require('ethereumjs-util')
const { sha3 } = require('web3-utils')
const { hash: namehash } = require('eth-ens-namehash')
const { assertRevert, assertBn, assertAmountOfEvents } = require('@aragon/contract-helpers-test/src/asserts')
const { newDao, installNewApp, getInstalledApp, encodeCallScript } = require('@aragon/contract-helpers-test/src/aragon-os')
const { EMPTY_BYTES, ZERO_ADDRESS, bn, injectWeb3, injectArtifacts } = require('@aragon/contract-helpers-test')

// Allow for sharing this test across other agent implementations and subclasses
module.exports = (agentName, { accounts, artifacts, web3 }) => {
  injectWeb3(web3)
  injectArtifacts(artifacts)

  const ExecutionTarget = artifacts.require('ExecutionTarget')
  const DesignatedSigner = artifacts.require('DesignatedSigner')
  const DestinationMock = artifacts.require('DestinationMock')
  const TokenInteractionExecutionTarget = artifacts.require('TokenInteractionExecutionTarget')
  const TokenMock = artifacts.require('TokenMock')

  const ETH = ZERO_ADDRESS
  const NO_SIG = EMPTY_BYTES
  const ERC165_SUPPORT_INVALID_ID = '0xffffffff'
  const ERC165_SUPPORT_INTERFACE_ID = '0x01ffc9a7'
  const ERC721_RECEIVED_INTERFACE_ID = '0x150b7a02'

  const AgentLike = artifacts.require(agentName)

  context(`> Shared tests for Agent-like apps`, () => {
    let agentBase, dao, acl, agent, agentAppId
    let EXECUTE_ROLE, SAFE_EXECUTE_ROLE, RUN_SCRIPT_ROLE, ADD_PROTECTED_TOKEN_ROLE, REMOVE_PROTECTED_TOKEN_ROLE, ADD_PRESIGNED_HASH_ROLE, DESIGNATE_SIGNER_ROLE, ERC1271_INTERFACE_ID

    const root = accounts[0]
    const authorized = accounts[1]
    const unauthorized = accounts[2]

    const encodeFunctionCall = (contract, functionName, ...params) => {
      const txParams = (params.length > 0 && typeof params[params.length - 1] === 'object') ? params.pop() : {}
      return contract.contract.methods[functionName](...params).call.request(txParams).params[0]
    }

    before('load roles', async () => {
      agentBase = await AgentLike.new()
      SAFE_EXECUTE_ROLE = await agentBase.SAFE_EXECUTE_ROLE()
      EXECUTE_ROLE = await agentBase.EXECUTE_ROLE()
      ADD_PROTECTED_TOKEN_ROLE = await agentBase.ADD_PROTECTED_TOKEN_ROLE()
      REMOVE_PROTECTED_TOKEN_ROLE = await agentBase.REMOVE_PROTECTED_TOKEN_ROLE()
      ADD_PRESIGNED_HASH_ROLE = await agentBase.ADD_PRESIGNED_HASH_ROLE()
      DESIGNATE_SIGNER_ROLE = await agentBase.DESIGNATE_SIGNER_ROLE()
      RUN_SCRIPT_ROLE = await agentBase.RUN_SCRIPT_ROLE()
      ERC1271_INTERFACE_ID = await agentBase.ERC1271_INTERFACE_ID()
    })

    beforeEach('deploy DAO with agent', async () => {
      ({ dao, acl } = await newDao(root))
      agentAppId = namehash(`${agentName}.aragonpm.test`)
      agent = await AgentLike.at(await installNewApp(dao, agentAppId, agentBase.address, root))
    })

    context('> Uninitialized', () => {
      it('cannot initialize base app', async () => {
        const newAgent = await AgentLike.new()
        assert.isTrue(await newAgent.isPetrified())
        await assertRevert(newAgent.initialize(), ERRORS.INIT_ALREADY_INITIALIZED)
      })

      it('can be initialized', async () => {
        await agent.initialize()
        assert.isTrue(await agent.hasInitialized())
      })

      it('cannot execute actions', async () => {
        await acl.createPermission(root, agent.address, EXECUTE_ROLE, root, { from: root })
        await assertRevert(agent.execute(accounts[8], 0, EMPTY_BYTES), ERRORS.APP_AUTH_FAILED)
      })

      it('cannot safe execute actions', async () => {
        await acl.createPermission(root, agent.address, SAFE_EXECUTE_ROLE, root, { from: root })
        await assertRevert(agent.safeExecute(accounts[8], EMPTY_BYTES), ERRORS.APP_AUTH_FAILED)
      })

      it('cannot add protected tokens', async () => {
        await acl.createPermission(root, agent.address, ADD_PROTECTED_TOKEN_ROLE, root, { from: root })
        await assertRevert(agent.addProtectedToken(accounts[8]), ERRORS.APP_AUTH_FAILED)
      })

      it('cannot remove protected tokens', async () => {
        await acl.createPermission(root, agent.address, REMOVE_PROTECTED_TOKEN_ROLE, root, { from: root })
        await assertRevert(agent.removeProtectedToken(accounts[8]), ERRORS.APP_AUTH_FAILED)
      })

      it('cannot add presigned hashes', async () => {
        const hash = sha3('hash') // careful as it may encode the data in the same way as solidity before hashing

        await acl.createPermission(root, agent.address, ADD_PRESIGNED_HASH_ROLE, root, { from: root })
        await assertRevert(agent.presignHash(hash), ERRORS.APP_AUTH_FAILED)
      })

      it('cannot set designated signers', async () => {
        await acl.createPermission(root, agent.address, DESIGNATE_SIGNER_ROLE, root, { from: root })
        await assertRevert(agent.setDesignatedSigner(accounts[8]), ERRORS.APP_AUTH_FAILED)
      })

      it('cannot forward actions', async () => {
        const action = { to: agent.address, calldata: agent.contract.methods.presignHash(accounts[8]).encodeABI() }
        const script = encodeCallScript([action])

        await acl.createPermission(root, agent.address, RUN_SCRIPT_ROLE, root, { from: root })
        await assertRevert(agent.forward(script), ERRORS.AGENT_CAN_NOT_FORWARD)
      })
    })

    context('> Initialized', () => {
      beforeEach(async () => {
        await agent.initialize()
      })

      it('fails on reinitialization', async () => {
        await assertRevert(agent.initialize(), ERRORS.INIT_ALREADY_INITIALIZED)
      })

      context('> Executing actions', () => {
        const [_, nonExecutor, executor] = accounts
        let executionTarget

        for (const depositAmount of [bn(0), bn(3)]) {
          context(depositAmount.gt(bn(0)) ? '> With ETH' : '> Without ETH', () => {
            beforeEach(async () => {
              await acl.createPermission(executor, agent.address, EXECUTE_ROLE, root, { from: root })

              executionTarget = await ExecutionTarget.new()
              assertBn(await executionTarget.counter(), 0, 'expected starting counter of execution target to be be 0')
              assertBn(await web3.eth.getBalance(executionTarget.address), 0, 'expected starting balance of execution target to be be 0')

              if (depositAmount.gt(bn(0))) {
                await agent.deposit(ETH, depositAmount, { value: depositAmount })
              }
              assertBn(await web3.eth.getBalance(agent.address), depositAmount, `expected starting balance of agent to be ${depositAmount}`)
            })

            it('can execute actions', async () => {
              const N = 1102

              const data = executionTarget.contract.methods.setCounter(N).encodeABI()
              const receipt = await agent.execute(executionTarget.address, depositAmount, data, { from: executor })

              assertAmountOfEvents(receipt, 'Execute')
              assertBn(await executionTarget.counter(), N, `expected counter to be ${N}`)
              assertBn(await web3.eth.getBalance(executionTarget.address), depositAmount, 'expected ending balance of execution target to be correct')
              assertBn(await web3.eth.getBalance(agent.address), 0, 'expected ending balance of agent at end to be 0')
            })

            it('can execute actions without data', async () => {
              const receipt = await agent.execute(executionTarget.address, depositAmount, EMPTY_BYTES, { from: executor })

              assertAmountOfEvents(receipt, 'Execute')
              // Fallback just runs ExecutionTarget.execute()
              assert.equal(await executionTarget.counter(), 1, 'expected counter to be 1')
              assertBn(await web3.eth.getBalance(executionTarget.address), depositAmount, 'expected ending balance of execution target to be correct')
              assertBn(await web3.eth.getBalance(agent.address), 0, 'expected ending balance of agent at end to be 0')
            })

            it('can execute cheap fallback actions', async () => {
              const cheapFallbackTarget = await DestinationMock.new(false)
              const receipt = await agent.execute(cheapFallbackTarget.address, depositAmount, EMPTY_BYTES, { from: executor })

              assertAmountOfEvents(receipt, 'Execute')
              assertBn(await web3.eth.getBalance(cheapFallbackTarget.address), depositAmount, 'expected ending balance of execution target to be correct')
              assertBn(await web3.eth.getBalance(agent.address), 0, 'expected ending balance of agent at end to be 0')
            })

            it('can execute expensive fallback actions', async () => {
              const expensiveFallbackTarget = await DestinationMock.new(true)
              assert.equal(await expensiveFallbackTarget.counter(), 0)

              const receipt = await agent.execute(expensiveFallbackTarget.address, depositAmount, EMPTY_BYTES, { from: executor })

              assertAmountOfEvents(receipt, 'Execute')
              // Fallback increments counter
              assert.equal(await expensiveFallbackTarget.counter(), 1)
              assertBn(await web3.eth.getBalance(expensiveFallbackTarget.address), depositAmount, 'expected ending balance of execution target to be correct')
              assertBn(await web3.eth.getBalance(agent.address), 0, 'expected ending balance of agent at end to be 0')
            })

            it('can execute with data when target is not a contract', async () => {
              const nonContract = accounts[8] // random account
              const nonContractBalance = await web3.eth.getBalance(nonContract)
              const randomData = '0x12345678'

              const receipt = await agent.execute(nonContract, depositAmount, randomData, { from: executor })

              assertAmountOfEvents(receipt, 'Execute')
              assertBn(await web3.eth.getBalance(nonContract), bn(nonContractBalance).add(depositAmount), 'expected ending balance of non-contract to be correct')
              assertBn(await web3.eth.getBalance(agent.address), 0, 'expected ending balance of agent at end to be 0')
            })

            it('can execute without data when target is not a contract', async () => {
              const nonContract = accounts[8] // random account
              const nonContractBalance = await web3.eth.getBalance(nonContract)

              const receipt = await agent.execute(nonContract, depositAmount, EMPTY_BYTES, { from: executor })

              assertAmountOfEvents(receipt, 'Execute')
              assertBn(await web3.eth.getBalance(nonContract), bn(nonContractBalance).add(depositAmount), 'expected ending balance of non-contract to be correct')
              assertBn(await web3.eth.getBalance(agent.address), 0, 'expected ending balance of agent at end to be 0')
            })

            it('fails to execute without permissions', async () => {
              const data = executionTarget.contract.methods.execute().encodeABI()

              await assertRevert(agent.execute(executionTarget.address, depositAmount, data, { from: nonExecutor }), ERRORS.APP_AUTH_FAILED)
            })

            it('fails to execute actions with more ETH than the agent owns', async () => {
              const data = executionTarget.contract.methods.execute().encodeABI()

              await assertRevert(agent.execute(executionTarget.address, depositAmount + 1, data, { from: executor }))
            })

            it('execution forwards success return data', async () => {
              const { to, data } = encodeFunctionCall(executionTarget, 'execute')

              // We make a call to easily get what data could be gotten inside the EVM
              // Contract -> agent.execute -> Target.func (would allow Contract to have access to this data)
              const call = encodeFunctionCall(agent, 'execute', to, depositAmount.toString(), data, { from: executor })
              const returnData = await web3.eth.call(call)

              // ExecutionTarget.execute() increments the counter by 1
              assert.equal(ethABI.decodeParameter('uint256', returnData), 1)
            })

            it('it reverts if executed action reverts', async () => {
              // TODO: Check revert data was correctly forwarded
              // ganache currently doesn't support fetching this data

              const data = executionTarget.contract.methods.fail().encodeABI()
              await assertRevert(agent.execute(executionTarget.address, depositAmount, data, { from: executor }))
            })

            context('depending on the sig ACL param', () => {
              const [granteeEqualToSig, granteeUnequalToSig] = accounts.slice(6) // random slice from accounts

              beforeEach(async () => {
                const sig = executionTarget.contract.methods.setCounter(1).encodeABI().slice(2, 10)
                const argId = '0x02' // arg 2
                const equalOp = '01'
                const nonEqualOp = '02'
                const value = `${'00'.repeat(30 - 4)}${sig}`

                const equalParam = new bn(`${argId}${equalOp}${value}`)
                const nonEqualParam = new bn(`${argId}${nonEqualOp}${value}`)

                await acl.grantPermissionP(granteeEqualToSig, agent.address, EXECUTE_ROLE, [equalParam], { from: root })
                await acl.grantPermissionP(granteeUnequalToSig, agent.address, EXECUTE_ROLE, [nonEqualParam], { from: root })
              })

              it('equal param: can execute if the signature matches', async () => {
                const N = 1102

                const data = executionTarget.contract.methods.setCounter(N).encodeABI()
                const receipt = await agent.execute(executionTarget.address, depositAmount, data, { from: granteeEqualToSig })

                assertAmountOfEvents(receipt, 'Execute')
                assert.equal(await executionTarget.counter(), N, `expected counter to be ${N}`)
                assertBn(await web3.eth.getBalance(executionTarget.address), depositAmount, 'expected ending balance of execution target to be correct')
                assertBn(await web3.eth.getBalance(agent.address), 0, 'expected ending balance of agent at end to be 0')
              })

              it('not equal param: can execute if the signature doesn\'t match', async () => {
                const data = executionTarget.contract.methods.execute().encodeABI()
                const receipt = await agent.execute(executionTarget.address, depositAmount, data, { from: granteeUnequalToSig })

                assertAmountOfEvents(receipt, 'Execute')
                assert.equal(await executionTarget.counter(), 1, `expected counter to be ${1}`)
                assertBn(await web3.eth.getBalance(executionTarget.address), depositAmount, 'expected ending balance of execution target to be correct')
                assertBn(await web3.eth.getBalance(agent.address), 0, 'expected ending balance of agent at end to be 0')
              })

              it('equal param: fails to execute if signature doesn\'t match', async () => {
                const data = executionTarget.contract.methods.execute().encodeABI()

                await assertRevert(agent.execute(executionTarget.address, depositAmount, data, { from: granteeEqualToSig }), ERRORS.APP_AUTH_FAILED)
              })

              it('not equal param: fails to execute if the signature matches', async () => {
                const N = 1102

                const data = executionTarget.contract.methods.setCounter(N).encodeABI()
                await assertRevert(agent.execute(executionTarget.address, depositAmount, data, { from: granteeUnequalToSig }), ERRORS.APP_AUTH_FAILED)
              })
            })
          })
        }
      })

      context('> Safe executing actions', () => {
        const amount = 1000
        let target, token1, token2

        beforeEach(async () => {
          target = await ExecutionTarget.new()
          token1 = await TokenMock.new(agent.address, amount)
          token2 = await TokenMock.new(agent.address, amount)

          await acl.createPermission(authorized, agent.address, ADD_PROTECTED_TOKEN_ROLE, root, { from: root })
          await acl.createPermission(authorized, agent.address, REMOVE_PROTECTED_TOKEN_ROLE, root, { from: root })
          await acl.createPermission(authorized, agent.address, SAFE_EXECUTE_ROLE, root, { from: root })

          await agent.addProtectedToken(token1.address, { from: authorized })
          await agent.addProtectedToken(token2.address, { from: authorized })

          assert.equal(await target.counter(), 0)
          assert.equal(await token1.balanceOf(agent.address), amount)
          assert.equal(await token2.balanceOf(agent.address), amount)
        })

        context('> sender has SAFE_EXECUTE_ROLE', () => {
          context('> and target is not a protected ERC20', () => {
            it('it can execute actions', async () => {
              const N = 1102
              const data = target.contract.methods.setCounter(N).encodeABI()
              const receipt = await agent.safeExecute(target.address, data, { from: authorized })

              assertAmountOfEvents(receipt, 'SafeExecute')
              assert.equal(await target.counter(), N)
            })

            it('it can execute actions without data', async () => {
              const receipt = await agent.safeExecute(target.address, EMPTY_BYTES, { from: authorized })

              assertAmountOfEvents(receipt, 'SafeExecute')
              assert.equal(await target.counter(), 1) // fallback just runs ExecutionTarget.execute()
            })

            it('it can execute cheap fallback actions', async () => {
              const cheapFallbackTarget = await DestinationMock.new(false)
              const receipt = await agent.safeExecute(cheapFallbackTarget.address, EMPTY_BYTES, { from: authorized })

              assertAmountOfEvents(receipt, 'SafeExecute')
            })

            it('it can execute expensive fallback actions', async () => {
              const expensiveFallbackTarget = await DestinationMock.new(true)
              assert.equal(await expensiveFallbackTarget.counter(), 0)
              const receipt = await agent.safeExecute(expensiveFallbackTarget.address, EMPTY_BYTES, { from: authorized })

              assertAmountOfEvents(receipt, 'SafeExecute')
              assert.equal(await expensiveFallbackTarget.counter(), 1) // fallback increments counter
            })

            it('it can execute with data when target is not a contract', async () => {
              const nonContract = accounts[8] // random account
              const randomData = '0x12345678'
              const receipt = await agent.safeExecute(nonContract, randomData, { from: authorized })

              assertAmountOfEvents(receipt, 'SafeExecute')
            })

            it('it can execute without data when target is not a contract', async () => {
              const nonContract = accounts[8] // random account
              const receipt = await agent.safeExecute(nonContract, EMPTY_BYTES, { from: authorized })

              assertAmountOfEvents(receipt, 'SafeExecute')
            })

            it('it can forward success return data', async () => {
              const { to, data } = encodeFunctionCall(target, 'execute')

              // We make a call to easily get what data could be gotten inside the EVM
              // Contract -> agent.safeExecute -> Target.func (would allow Contract to have access to this data)
              const call = encodeFunctionCall(agent, 'safeExecute', to, data, { from: authorized })
              const returnData = await web3.eth.call(call)

              // ExecutionTarget.execute() increments the counter by 1
              assert.equal(ethABI.decodeParameter('uint256', returnData), 1)
            })

            it('it should revert if executed action reverts', async () => {
              // TODO: Check revert data was correctly forwarded
              // ganache currently doesn't support fetching this data
              const data = target.contract.methods.fail().encodeABI()
              await assertRevert(agent.safeExecute(target.address, data, { from: authorized }))
            })

            context('> but action affects a protected ERC20 balance', () => {
              let tokenInteractionTarget

              beforeEach(async () => {
                tokenInteractionTarget = await TokenInteractionExecutionTarget.new()
              })

              context('> action decreases protected ERC20 balance', () => {
                it('it should revert', async () => {
                  const newToken = await TokenMock.new(agent.address, amount)
                  const initialBalance = await newToken.balanceOf(agent.address)

                  const approve = newToken.contract.methods.approve(tokenInteractionTarget.address, 10).encodeABI()
                  await agent.safeExecute(newToken.address, approve, { from: authorized }) // target is now allowed to transfer on behalf of agent

                  await agent.addProtectedToken(newToken.address, { from: authorized }) // new token is now protected (must do this after execution)
                  const data = tokenInteractionTarget.contract.methods.transferTokenFrom(newToken.address).encodeABI()

                  await assertRevert(agent.safeExecute(tokenInteractionTarget.address, data, { from: authorized }), ERRORS.AGENT_PROTECTED_BALANCE_LOWERED)
                  const newBalance = await newToken.balanceOf(agent.address)

                  assertBn(initialBalance, newBalance)
                })
              })

              context('> action increases protected ERC20 balance', () => {
                it('it should execute action', async () => {
                  const newToken = await TokenMock.new(tokenInteractionTarget.address, amount)
                  const initialBalance = await newToken.balanceOf(agent.address)
                  await agent.addProtectedToken(newToken.address, { from: authorized }) // newToken is now protected

                  const data = tokenInteractionTarget.contract.methods.transferTokenTo(newToken.address).encodeABI()
                  await agent.safeExecute(tokenInteractionTarget.address, data, { from: authorized })
                  const newBalance = await newToken.balanceOf(agent.address)

                  assertBn(newBalance, 1)
                  assert.notEqual(initialBalance, newBalance)
                })
              })
            })

            context('> but action affects protected tokens list', () => {
              let tokenInteractionTarget

              beforeEach(async () => {
                tokenInteractionTarget = await TokenInteractionExecutionTarget.new()
              })

              it('it should revert', async () => {
                await acl.grantPermission(tokenInteractionTarget.address, agent.address, REMOVE_PROTECTED_TOKEN_ROLE, { from: root }) // grant target permission to remove protected tokens
                const data = tokenInteractionTarget.contract.methods.removeProtectedToken(token2.address).encodeABI()

                await assertRevert(agent.safeExecute(tokenInteractionTarget.address, data, { from: authorized }), ERRORS.AGENT_PROTECTED_TOKENS_MODIFIED)
              })
            })
          })

          context('> but target is a protected ERC20', () => {
            it('it should revert', async () => {
              const approve = token1.contract.methods.approve(target.address, 10).encodeABI()

              await assertRevert(agent.safeExecute(token1.address, approve, { from: authorized }), ERRORS.AGENT_TARGET_PROTECTED)
            })
          })
        })

        context('> sender does not have SAFE_EXECUTE_ROLE', () => {
          it('it should revert', async () => {
            const data = target.contract.methods.execute().encodeABI()

            await assertRevert(agent.safeExecute(target.address, data, { from: unauthorized }), ERRORS.APP_AUTH_FAILED)
          })
        })
      })

      context('> Running scripts', () => {
        let executionTarget, script
        const [_, nonScriptRunner, scriptRunner] = accounts

        beforeEach(async () => {
          executionTarget = await ExecutionTarget.new()
          // prepare script
          const action = { to: executionTarget.address, calldata: executionTarget.contract.methods.execute().encodeABI() }
          script = encodeCallScript([action, action]) // perform action twice

          await acl.createPermission(scriptRunner, agent.address, RUN_SCRIPT_ROLE, root, { from: root })
        })

        it('runs script', async () => {
          assert.isTrue(await agent.canForward(scriptRunner, script))
          assert.equal(await executionTarget.counter(), 0)

          const receipt = await agent.forward(script, { from: scriptRunner })

          // Should execute ExecutionTarget.execute() twice
          assert.equal(await executionTarget.counter(), 2)
          assertAmountOfEvents(receipt, 'ScriptResult')
        })

        it('fails to run script without permissions', async () => {
          assert.isFalse(await agent.canForward(nonScriptRunner, script))
          assert.equal(await executionTarget.counter(), 0)

          await assertRevert(agent.forward(script, { from: nonScriptRunner }), ERRORS.AGENT_CAN_NOT_FORWARD)
          assert.equal(await executionTarget.counter(), 0)
        })
      })

      context('> Adding protected tokens', () => {
        beforeEach(async () => {
          await acl.createPermission(authorized, agent.address, ADD_PROTECTED_TOKEN_ROLE, root, { from: root })
        })

        context('> sender has ADD_PROTECTED_TOKEN_ROLE', () => {
          context('> and token is ERC20', () => {
            context('> and token is not already protected', () => {
              context('> and protected tokens cap has not yet been reached', () => {
                it('it should add protected token', async () => {
                  const token1 = await TokenMock.new(agent.address, 10000)
                  const token2 = await TokenMock.new(agent.address, 10000)

                  const receipt1 = await agent.addProtectedToken(token1.address, { from: authorized })
                  const receipt2 = await agent.addProtectedToken(token2.address, { from: authorized })

                  assertAmountOfEvents(receipt1, 'AddProtectedToken')
                  assertAmountOfEvents(receipt2, 'AddProtectedToken')
                  assert.equal(await agent.protectedTokens(0), token1.address)
                  assert.equal(await agent.protectedTokens(1), token2.address)
                })
              })

              context('> but protected tokens cap has been reached', () => {
                beforeEach(async () => {
                  const token1 = await TokenMock.new(agent.address, 1000)
                  const token2 = await TokenMock.new(agent.address, 1000)
                  const token3 = await TokenMock.new(agent.address, 1000)
                  const token4 = await TokenMock.new(agent.address, 1000)
                  const token5 = await TokenMock.new(agent.address, 1000)
                  const token6 = await TokenMock.new(agent.address, 1000)
                  const token7 = await TokenMock.new(agent.address, 1000)
                  const token8 = await TokenMock.new(agent.address, 1000)
                  const token9 = await TokenMock.new(agent.address, 1000)
                  const token10 = await TokenMock.new(agent.address, 1000)

                  await agent.addProtectedToken(token1.address, { from: authorized })
                  await agent.addProtectedToken(token2.address, { from: authorized })
                  await agent.addProtectedToken(token3.address, { from: authorized })
                  await agent.addProtectedToken(token4.address, { from: authorized })
                  await agent.addProtectedToken(token5.address, { from: authorized })
                  await agent.addProtectedToken(token6.address, { from: authorized })
                  await agent.addProtectedToken(token7.address, { from: authorized })
                  await agent.addProtectedToken(token8.address, { from: authorized })
                  await agent.addProtectedToken(token9.address, { from: authorized })
                  await agent.addProtectedToken(token10.address, { from: authorized })
                })

                it('it should revert', async () => {
                  const token10 = await TokenMock.new(agent.address, 10000)

                  await assertRevert(agent.addProtectedToken(token10.address, { from: authorized }), ERRORS.AGENT_TOKENS_CAP_REACHED)
                })
              })
            })

            context('> but token is already protected', () => {
              it('it should revert', async () => {
                const token = await TokenMock.new(agent.address, 10000)
                await agent.addProtectedToken(token.address, { from: authorized })

                await assertRevert(agent.addProtectedToken(token.address, { from: authorized }), ERRORS.AGENT_TOKEN_ALREADY_PROTECTED)
              })
            })
          })

          context('> but token is not ERC20', () => {
            it('it should revert [token is not a contract]', async () => {
              await assertRevert(agent.addProtectedToken(root, { from: authorized }), ERRORS.AGENT_TOKEN_NOT_ERC20)
            })

            it('it should revert [token is a contract but not an ERC20]', async () => {
              // The balanceOf check reverts here, so it's a SafeERC20 error
              await assertRevert(agent.addProtectedToken(dao.address, { from: authorized }), ERRORS.SAFE_ERC_20_BALANCE_REVERTED)
            })
          })
        })

        context('> sender does not have ADD_PROTECTED_TOKEN_ROLE', () => {
          it('it should revert', async () => {
            const token = await TokenMock.new(agent.address, 10000)

            await assertRevert(agent.addProtectedToken(token.address, { from: unauthorized }), ERRORS.APP_AUTH_FAILED)
          })
        })
      })

      context('> Removing protected tokens', () => {
        beforeEach(async () => {
          await acl.createPermission(authorized, agent.address, ADD_PROTECTED_TOKEN_ROLE, root, { from: root })
          await acl.createPermission(authorized, agent.address, REMOVE_PROTECTED_TOKEN_ROLE, root, { from: root })
        })

        context('> sender has REMOVE_PROTECTED_TOKEN_ROLE', () => {
          context('> and token is actually protected', () => {
            let token1, token2, token3

            beforeEach(async () => {
              token1 = await TokenMock.new(agent.address, 10000)
              token2 = await TokenMock.new(agent.address, 10000)
              token3 = await TokenMock.new(agent.address, 10000)

              await agent.addProtectedToken(token1.address, { from: authorized })
              await agent.addProtectedToken(token2.address, { from: authorized })
              await agent.addProtectedToken(token3.address, { from: authorized })
            })

            it('it should remove protected token', async () => {
              const receipt1 = await agent.removeProtectedToken(token1.address, { from: authorized })
              const receipt2 = await agent.removeProtectedToken(token3.address, { from: authorized })

              assertAmountOfEvents(receipt1, 'RemoveProtectedToken')
              assertAmountOfEvents(receipt2, 'RemoveProtectedToken')

              assert.equal(await agent.getProtectedTokensLength(), 1)
              assert.equal(await agent.protectedTokens(0), token2.address)
              await assertRevert(agent.protectedTokens(1)) // this should overflow the length of the protectedTokens array and thus revert
            })
          })

          context('> but token is not actually protected', () => {
            it('it should revert', async () => {
              const token1 = await TokenMock.new(agent.address, 10000)
              const token2 = await TokenMock.new(agent.address, 10000)
              await agent.addProtectedToken(token1.address, { from: authorized })

              await assertRevert(agent.removeProtectedToken(token2.address, { from: authorized }), ERRORS.AGENT_TOKEN_NOT_PROTECTED)
            })
          })
        })

        context('> sender does not have REMOVE_PROTECTED_TOKEN_ROLE', () => {
          it('it should revert', async () => {
            const token = await TokenMock.new(agent.address, 10000)
            await agent.addProtectedToken(token.address, { from: authorized })

            await assertRevert(agent.removeProtectedToken(token.address, { from: unauthorized }), ERRORS.APP_AUTH_FAILED)
          })
        })
      })

      context('> Accessing protected tokens', () => {
        beforeEach(async () => {
          await acl.createPermission(authorized, agent.address, ADD_PROTECTED_TOKEN_ROLE, root, { from: root })
        })

        context('> when there are protected tokens', () => {
          let token

          beforeEach(async () => {
            token = await TokenMock.new(agent.address, 10000)
            await agent.addProtectedToken(token.address, { from: authorized })
          })

          it('has correct protected tokens length', async () => {
            assert.equal(await agent.getProtectedTokensLength(), 1)
          })

          it('can access protected token', async () => {
            const protectedTokenAddress = await agent.protectedTokens(0)
            assert.equal(token.address, protectedTokenAddress)
          })

          it('cannot access non-existent protected tokens', async () => {
            assertRevert(agent.protectedTokens(1))
          })
        })

        context('> when there are no protected tokens', () => {
          it('has correct protected tokens length', async () => {
            assert.equal(await agent.getProtectedTokensLength(), 0)
          })

          it('cannot access non-existent protected tokens', async () => {
            assertRevert(agent.protectedTokens(0))
          })
        })
      })

      context('> Signing messages', () => {
        const [_, nobody, presigner, signerDesignator] = accounts
        const HASH = sha3('hash') // careful as it may encode the data in the same way as solidity before hashing

        const SIGNATURE_MODES = {
          Invalid: '0x00',
          EIP712: '0x01',
          EthSign: '0x02',
          ERC1271: '0x03',
          NMode: '0x04',
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

        it('supports ERC721Receiver interface', async () => {
          assert.isTrue(await agent.supportsInterface(ERC721_RECEIVED_INTERFACE_ID))
        })

        it('doesn\'t support any other interface', async () => {
          assert.isFalse(await agent.supportsInterface('0x12345678'))
          assert.isFalse(await agent.supportsInterface('0x'))
        })

        it('isValidSignature returns false if there is not designated signer and hash isn\'t presigned', async () => {
          assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, NO_SIG))
        })

        it('presigns a hash', async () => {
          await agent.presignHash(HASH, { from: presigner })

          assertIsValidSignature(true, await agent.isValidSignatureBytes32(HASH, NO_SIG))
        })

        it('fails to presign a hash if not authorized', async () => {
          await assertRevert(agent.presignHash(HASH, { from: nobody }), ERRORS.APP_AUTH_FAILED)
          assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, NO_SIG))
        })

        context('> Designated signer', () => {
          const ethSign = async (hash, signer) => {
            const packedSig = await web3.eth.sign(hash, signer)
            const chainId = await web3.eth.net.getId()
            // Ganache encodes the v value of the signature as 0 or 1, 
            // while it should be 27 or 28. Buidler uses the same 
            // values as geth. 
            // If we detect buidlerevm we don't use ganache encoding
            const offset = chainId === 31337 ? 0 : 27

            return {
              r: ethUtil.toBuffer('0x' + packedSig.substring(2, 66)),
              s: ethUtil.toBuffer('0x' + packedSig.substring(66, 130)),
              v: parseInt(packedSig.substring(130, 132), 16) + offset,
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
              const childAgent = await AgentLike.at(getInstalledApp(agentReceipt, agentAppId))

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
                assertIsValidSignature(true, await agent.isValidSignatureBytes32(HASH, signature))
              })

              it('isValidSignature returns true to a valid signature with legacy version', async () => {
                const legacyVersionSignature = await sign(HASH, signerOrKey, true)
                assertIsValidSignature(true, await agent.isValidSignatureBytes32(HASH, legacyVersionSignature))
              })

              it('isValidSignature returns false to an invalid signature', async () => {
                const badSignature = (await sign(HASH, signerOrKey)).slice(0, -2) // drop last byte
                assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, badSignature))
              })

              it('isValidSignature returns false to a signature with an invalid v', async () => {
                const invalidVersionSignature = await sign(HASH, signerOrKey, false, true)
                assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, invalidVersionSignature))
              })

              it('isValidSignature returns false to an unauthorized signer', async () => {
                const otherSignature = await sign(HASH, notSignerOrKey)
                assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, otherSignature))
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

              assertIsValidSignature(true, await agent.isValidSignatureBytes32(HASH, ERC1271_SIG))
            })

            it('isValidSignature returns false if designated signer returns false', async () => {
              // true  - ERC165 interface compliant
              // false - sigs are invalid
              // false - doesn't revert on checking sig
              // false - doesn't modify state on checking sig
              await setDesignatedSignerContract(true, false, false, false)

              // Signature fails check
              assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, ERC1271_SIG))
            })

            it('isValidSignature returns true even if the designated signer doesnt support the interface', async () => {
              // false - not ERC165 interface compliant
              // true  - any sigs are valid
              // false - doesn't revert on checking sig
              // false - doesn't modify state on checking sig
              await setDesignatedSignerContract(false, true, false, false)

              assertIsValidSignature(true, await agent.isValidSignatureBytes32(HASH, ERC1271_SIG))
            })

            it('isValidSignature returns false if designated signer reverts', async () => {
              // true  - ERC165 interface compliant
              // true  - any sigs are valid
              // true  - reverts on checking sig
              // false - doesn't modify state on checking sig
              await setDesignatedSignerContract(true, true, true, false)

              // Reverts on checking
              assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, ERC1271_SIG))
            })

            it('isValidSignature returns false if designated signer attempts to modify state', async () => {
              // true  - ERC165 interface compliant
              // true  - any sigs are valid
              // false - doesn't revert on checking sig
              // true  - modifies state on checking sig
              await setDesignatedSignerContract(true, true, false, true)

              // Checking costs too much gas
              assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, ERC1271_SIG))
            })
          })

          context(`> Signature mode: invalid modes`, () => {
            const randomAccount = accounts[9]

            beforeEach(async () => {
              await agent.setDesignatedSigner(randomAccount, { from: signerDesignator })
            })

            it('isValidSignature returns false to an empty signature', async () => {
              const emptySig = '0x'
              assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, emptySig))
            })

            it('isValidSignature returns false to an invalid mode signature', async () => {
              const invalidSignature = SIGNATURE_MODES.Invalid
              assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, invalidSignature))
            })

            it('isValidSignature returns false to an unspecified mode signature', async () => {
              const unspecifiedSignature = SIGNATURE_MODES.NMode
              assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, unspecifiedSignature))
            })

            it('isValidSignature returns true to an invalid signature iff the hash was presigned', async () => {
              const invalidSignature = SIGNATURE_MODES.Invalid
              assertIsValidSignature(false, await agent.isValidSignatureBytes32(HASH, invalidSignature))

              // Now presign it
              await agent.presignHash(HASH, { from: presigner })
              assertIsValidSignature(true, await agent.isValidSignatureBytes32(HASH, invalidSignature))
            })
          })

          context('> Signature mode: self', () => {
            it('cannot set itself as the designated signer', async () => {
              await assertRevert(agent.setDesignatedSigner(agent.address, { from: signerDesignator }), ERRORS.AGENT_DESIGNATED_TO_SELF)
            })
          })
        })
      })
    })
  })
}
