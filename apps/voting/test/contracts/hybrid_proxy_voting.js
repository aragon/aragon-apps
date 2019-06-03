const VOTER_STATE = require('../helpers/state')
const { bigExp, pct } = require('../helpers/numbers')(web3)
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)
const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { encodeCallScript } = require('@aragon/test-helpers/evmScript')
const { decodeEventsOfType } = require('@aragon/os/test/helpers/decodeEvent')
const { getEventArgument, getNewProxyAddress } = require('@aragon/test-helpers/events')
const { assertEvent, assertAmountOfEvents } = require('@aragon/test-helpers/assertEvent')(web3)

const Voting = artifacts.require('VotingMock')
const ProxyVoting = artifacts.require('HybridProxyVotingMock')
const RepresentativeProxy = artifacts.require('HybridRepresentativeProxy')
const ProxyVotingRegistry = artifacts.require('ProxyVotingRegistryMock')
const ExecutionTarget = artifacts.require('ExecutionTarget')

const ACL = artifacts.require('@aragon/os/contracts/acl/ACL')
const Kernel = artifacts.require('@aragon/os/contracts/kernel/Kernel')
const DAOFactory = artifacts.require('@aragon/os/contracts/factory/DAOFactory')
const EVMScriptRegistryFactory = artifacts.require('@aragon/os/contracts/factory/EVMScriptRegistryFactory')
const MiniMeToken = artifacts.require('@aragon/apps-shared-minime/contracts/MiniMeToken')

const ANY_ADDR = '0xffffffffffffffffffffffffffffffffffffffff'
const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

contract('HybridProxyVoting', ([_, root, principal, representative, anotherRepresentative, anyone, anotherVoting]) => {
  let votingBase, kernelBase, aclBase, daoFactory
  let dao, acl, voting, token, executionTarget, script, voteId, principalProxy, representativeProxy
  let APP_MANAGER_ROLE, CREATE_VOTES_ROLE, MODIFY_SUPPORT_ROLE, MODIFY_QUORUM_ROLE

  const NOW = 1553703809  // random fixed timestamp in seconds
  const ONE_DAY = 60 * 60 * 24
  const OVERRULE_WINDOW = ONE_DAY
  const VOTING_DURATION = ONE_DAY * 5

  const MIN_QUORUM = pct(20)
  const MIN_SUPPORT = pct(70)

  before('deploy base implementations', async () => {
    kernelBase = await Kernel.new(true) // petrify immediately
    aclBase = await ACL.new()
    const regFact = await EVMScriptRegistryFactory.new()
    daoFactory = await DAOFactory.new(kernelBase.address, aclBase.address, regFact.address)
    votingBase = await Voting.new()
  })

  before('load roles', async () => {
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    CREATE_VOTES_ROLE = await votingBase.CREATE_VOTES_ROLE()
    MODIFY_SUPPORT_ROLE = await votingBase.MODIFY_SUPPORT_ROLE()
    MODIFY_QUORUM_ROLE = await votingBase.MODIFY_QUORUM_ROLE()
  })

  before('create dao', async () => {
    const receipt = await daoFactory.newDAO(root)
    dao = Kernel.at(getEventArgument(receipt, 'DeployDAO', 'dao'))
    acl = ACL.at(await dao.acl())
    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })
  })

  beforeEach('mint tokens', async () => {
    token = await MiniMeToken.new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 18, 'n', true, { from: root }) // empty parameters minime
    await token.generateTokens(principal, bigExp(51, 18), { from: root })
  })

  beforeEach('create proxy voting and representative proxy', async () => {
    const registry = await ProxyVotingRegistry.new()

    const representativeReceipt = await registry.newRepresentativeProxy({ from: representative })
    const representativeProxyAddress = getEventArgument(representativeReceipt, 'NewRepresentativeProxy', 'representativeProxy')
    assert(await registry.isValidRepresentativeProxy(representativeProxyAddress), 'representative proxy is not valid')
    representativeProxy = RepresentativeProxy.at(representativeProxyAddress)

    const principalReceipt = await registry.newProxyVoting(OVERRULE_WINDOW, { from: principal })
    const proxyVotingAddress = getEventArgument(principalReceipt, 'NewProxyVoting', 'proxyVoting')
    assert(await registry.isValidProxyVoting(proxyVotingAddress), 'proxy voting is not valid')
    principalProxy = ProxyVoting.at(proxyVotingAddress)
    await token.transfer(principalProxy.address, bigExp(51, 18), { from: principal })
  })

  beforeEach('create voting app', async () => {
    const receipt = await dao.newAppInstance('0x1234', votingBase.address, '0x', false, { from: root })
    voting = Voting.at(getNewProxyAddress(receipt))

    await principalProxy.mockSetTimestamp(NOW)
    await voting.mockSetTimestamp(NOW)
    await voting.initialize(token.address, MIN_SUPPORT, MIN_QUORUM, VOTING_DURATION, { from: root })

    await acl.createPermission(ANY_ADDR, voting.address, CREATE_VOTES_ROLE, root, { from: root })
    await acl.createPermission(ANY_ADDR, voting.address, MODIFY_SUPPORT_ROLE, root, { from: root })
    await acl.createPermission(ANY_ADDR, voting.address, MODIFY_QUORUM_ROLE, root, { from: root })
  })

  const createVote = async (from = principal) => {
    executionTarget = await ExecutionTarget.new()
    const action = { to: executionTarget.address, calldata: executionTarget.contract.execute.getData() }
    script = encodeCallScript([action])

    const { tx } = await principalProxy.newVote(voting.address, script, 'metadata', { from })
    const receipt = await web3.eth.getTransactionReceipt(tx)
    const events = decodeEventsOfType(receipt, Voting.abi, 'StartVote')
    assert.equal(events.length, 1, 'number of StartVote emitted events does not match')
    const startVoteEvent = events[0].args
    voteId = startVoteEvent.voteId
    return startVoteEvent
  }

  const getVoteState = async () => {
    const [open, executed, startDate, snapshotBlock, support, quorum, yeas, nays, votingPower, execScript] = await voting.getVote(voteId)
    return { open, executed, startDate, snapshotBlock, support, quorum, yeas, nays, votingPower, execScript }
  }

  const getVoterState = async (voter) => voting.getVoterState(voteId, voter)

  const increaseTime = async (seconds) => {
    await voting.mockIncreaseTime(seconds)
    await principalProxy.mockIncreaseTime(seconds)
  }

  describe('setFullRepresentative', () => {
    context('when the sender is the principal', () => {
      const from = principal

      context('when the proxy voting is valid', () => {
        it('is not allowed by default', async () => {
          assert.isFalse(await principalProxy.isRepresentativeFullyAllowed(representativeProxy.address))
        })

        context('when the representative was not set yet', () => {
          context('when the representative is not blacklisted', () => {
            it('sets the given representative', async () => {
              const receipt = await principalProxy.setFullRepresentative(representativeProxy.address, true, { from })

              assertAmountOfEvents(receipt, 'ChangeFullRepresentative')
              assertEvent(receipt, 'ChangeFullRepresentative', { representative: representativeProxy.address, allowed: true })

              assert.isTrue(await principalProxy.isRepresentativeFullyAllowed(representativeProxy.address))
            })
          })

          context('when the representative is blacklisted', () => {
            beforeEach('blacklist representative', async () => {
              await representativeProxy.blacklistPrincipal(principalProxy.address, true, { from: representative })
            })

            it('reverts', async () => {
              await assertRevert(principalProxy.setFullRepresentative(representativeProxy.address, true, { from }), 'RP_BLACKLISTED_SENDER')
            })
          })
        })

        context('when the representative was already set', () => {
          beforeEach('add representative', async () => {
            await principalProxy.setFullRepresentative(representativeProxy.address, true, { from })
          })

          it('updates the given representative', async () => {
            const receipt = await principalProxy.setFullRepresentative(representativeProxy.address, false, { from })

            assertAmountOfEvents(receipt, 'ChangeFullRepresentative')
            assertEvent(receipt, 'ChangeFullRepresentative', { representative: representativeProxy.address, allowed: false })

            assert.isFalse(await principalProxy.isRepresentativeFullyAllowed(representativeProxy.address))
          })
        })
      })

      context('when the proxy voting is valid', () => {
        it('reverts', async () => {
          const invalidProxyVoting = await ProxyVoting.new(principal, OVERRULE_WINDOW)
          await assertRevert(invalidProxyVoting.setFullRepresentative(representativeProxy.address, true, { from }), 'RP_SENDER_NOT_PROXY_VOTING')
        })
      })
    })

    context('when the sender is not the principal', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(principalProxy.setFullRepresentative(representativeProxy.address, true, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('setInstanceRepresentative', () => {
    context('when the sender is the principal', () => {
      const from = principal

      context('when the proxy voting is valid', () => {
        it('is not allowed by default', async () => {
          assert.isFalse(await principalProxy.isRepresentativeAllowedForInstance(representativeProxy.address, voting.address))
        })

        context('when the representative was not set yet', () => {
          context('when the representative is not blacklisted', () => {
            it('sets the given representative', async () => {
              const receipt = await principalProxy.setInstanceRepresentative(representativeProxy.address, voting.address, true, {from})

              assertAmountOfEvents(receipt, 'ChangeInstanceRepresentative')
              assertEvent(receipt, 'ChangeInstanceRepresentative', {
                representative: representativeProxy.address,
                voting: voting.address,
                allowed: true
              })

              assert.isTrue(await principalProxy.isRepresentativeAllowedForInstance(representativeProxy.address, voting.address))
            })
          })

          context('when the representative is blacklisted', () => {
            beforeEach('blacklist representative', async () => {
              await representativeProxy.blacklistPrincipal(principalProxy.address, true, {from: representative})
            })

            it('reverts', async () => {
              await assertRevert(principalProxy.setInstanceRepresentative(representativeProxy.address, voting.address, true, {from}), 'RP_BLACKLISTED_SENDER')
            })
          })
        })

        context('when the representative was already set', () => {
          beforeEach('add representative', async () => {
            await principalProxy.setInstanceRepresentative(representativeProxy.address, voting.address, true, {from})
          })

          it('updates the given representative', async () => {
            const receipt = await principalProxy.setInstanceRepresentative(representativeProxy.address, voting.address, false, { from })

            assertAmountOfEvents(receipt, 'ChangeInstanceRepresentative')
            assertEvent(receipt, 'ChangeInstanceRepresentative', {
              representative: representativeProxy.address,
              voting: voting.address,
              allowed: false
            })

            assert.isFalse(await principalProxy.isRepresentativeAllowedForInstance(representativeProxy.address, voting.address))
          })
        })
      })

      context('when the proxy voting is valid', () => {
        it('reverts', async () => {
          const invalidProxyVoting = await ProxyVoting.new(principal, OVERRULE_WINDOW)
          await assertRevert(invalidProxyVoting.setInstanceRepresentative(representativeProxy.address, voting.address, false, { from }), 'RP_SENDER_NOT_PROXY_VOTING')
        })
      })
    })

    context('when the sender is not the principal', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(principalProxy.setInstanceRepresentative(representativeProxy.address, voting.address, true, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('setVoteRepresentative', () => {
    beforeEach('create a vote', createVote)

    context('when the sender is the principal', () => {
      const from = principal

      context('when the proxy voting is valid', () => {
        it('is not allowed by default', async () => {
          assert.isFalse(await principalProxy.isRepresentativeAllowedForVote(representativeProxy.address, voting.address, voteId))
        })

        context('when the representative was not set yet', () => {
          context('when the representative is not blacklisted', () => {
            it('sets the given representative', async () => {
              const receipt = await principalProxy.setVoteRepresentative(representativeProxy.address, voting.address, voteId, true, {from})

              assertAmountOfEvents(receipt, 'ChangeVoteRepresentative')
              assertEvent(receipt, 'ChangeVoteRepresentative', {
                representative: representativeProxy.address,
                voting: voting.address,
                voteId,
                allowed: true
              })

              assert.isTrue(await principalProxy.isRepresentativeAllowedForVote(representativeProxy.address, voting.address, voteId))
            })
          })

          context('when the representative is blacklisted', () => {
            beforeEach('blacklist representative', async () => {
              await representativeProxy.blacklistPrincipal(principalProxy.address, true, {from: representative})
            })

            it('reverts', async () => {
              await assertRevert(principalProxy.setVoteRepresentative(representativeProxy.address, voting.address, voteId, true, {from}), 'RP_BLACKLISTED_SENDER')
            })
          })
        })

        context('when the representative was already set', () => {
          beforeEach('add representative', async () => {
            await principalProxy.setVoteRepresentative(representativeProxy.address, voting.address, voteId, true, {from})
          })

          it('updates the given representative', async () => {
            const receipt = await principalProxy.setVoteRepresentative(representativeProxy.address, voting.address, voteId, false, { from })

            assertAmountOfEvents(receipt, 'ChangeVoteRepresentative')
            assertEvent(receipt, 'ChangeVoteRepresentative', {
              representative: representativeProxy.address,
              voting: voting.address,
              voteId,
              allowed: false
            })

            assert.isFalse(await principalProxy.isRepresentativeAllowedForVote(representativeProxy.address, voting.address, voteId))
          })
        })
      })

      context('when the proxy voting is valid', () => {
        it('reverts', async () => {
          const invalidProxyVoting = await ProxyVoting.new(principal, OVERRULE_WINDOW)
          await assertRevert(invalidProxyVoting.setVoteRepresentative(representativeProxy.address, voting.address, voteId, false, { from }), 'RP_SENDER_NOT_PROXY_VOTING')
        })
      })
    })

    context('when the sender is not the principal', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(principalProxy.setVoteRepresentative(representativeProxy.address, voting.address, voteId, true, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('newVote', () => {
    context('when the sender is the principal', () => {
      let startVoteEvent
      const from = principal

      beforeEach('create a vote', async () => {
        startVoteEvent = await createVote(from)
      })

      it('creates a vote', async () => {
        assert.equal(voteId, 0, 'vote id should be correct')
        assert.equal(startVoteEvent.metadata, 'metadata', 'should have returned correct metadata')
        assert.equal(startVoteEvent.creator, web3.toChecksumAddress(principalProxy.address), 'creator should be correct')
      })

      it('does not cast the principal votes and has the correct state', async () => {
        const { open, executed, yeas, nays } = await getVoteState()

        assert.isTrue(open, 'vote should be open')
        assert.isFalse(executed, 'vote should not be executed')
        assert.equal(yeas.toString(), 0, 'yeas should be 0')
        assert.equal(nays.toString(), 0, 'nays should be 0')
        assert.equal(await getVoterState(principal), VOTER_STATE.ABSENT, 'principal should not have voted yet')
        assert.equal(await getVoterState(principalProxy.address), VOTER_STATE.ABSENT, 'principal proxy should not have voted yet')
      })

      it('sets it up correctly', async () => {
        const { startDate, snapshotBlock, support, quorum, votingPower, execScript } = await getVoteState()

        assert.equal(startDate.toString(), NOW, 'start date should be correct')
        assert.equal(snapshotBlock.toString(), await getBlockNumber() - 1, 'snapshot block should be correct')
        assert.equal(support.toString(), MIN_SUPPORT.toString(), 'required support should be app required support')
        assert.equal(quorum.toString(), MIN_QUORUM.toString(), 'min quorum should be app min quorum')
        assert.equal(votingPower.toString(), bigExp(51, 18).toString(), 'voting power should be 100')
        assert.equal(execScript, script, 'script should be correct')
      })
    })

    context('when the sender is not the principal', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(principalProxy.newVote(voting.address, script, 'metadata', { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('proxyVote', () => {
    context('when the vote exists', () => {
      beforeEach('create a vote', createVote)

      context('when the representative is an EOA', () => {
        context('when the representative is not allowed', () => {
          const from = representative

          const itReverts = () => {
            it('reverts', async () => {
              await assertRevert(principalProxy.proxyVote(voting.address, voteId, true, { from }), 'PV_REPRESENTATIVE_NOT_ALLOWED')
            })
          }

          context('when the representative is not allowed at all', () => {
            itReverts()
          })

          context('when the representative is allowed for a another vote instance', () => {
            beforeEach('allow representative for another instance', async () => {
              await principalProxy.setInstanceRepresentative(representative, anotherVoting, true, { from: principal })
            })

            itReverts()
          })

          context('when the representative is allowed for a another vote', () => {
            beforeEach('allow representative for another vote', async () => {
              await principalProxy.setVoteRepresentative(representative, voting.address, voteId + 1, true, { from: principal })
            })

            itReverts()
          })
        })

        context('when the representative is allowed', () => {
          const from = representative

          context('when not within the overrule window', () => {
            const itCastsTheProxiedVote = () => {
              beforeEach('proxy representative\'s vote', async () => {
                await principalProxy.proxyVote(voting.address, voteId, false, { from: representative })
              })

              it('casts the proxied vote', async () => {
                const { yeas, nays } = await getVoteState()

                assert.equal(yeas.toString(), 0, 'yeas should be 0')
                assert.equal(nays.toString(), bigExp(51, 18).toString(), 'nays should be 51%')
                assert.equal(await getVoterState(principal), VOTER_STATE.ABSENT, 'principal proxy should have voted')
                assert.equal(await getVoterState(principalProxy.address), VOTER_STATE.NAY, 'principal proxy should have voted')
              })

              it('cannot be changed by the same representative', async () => {
                await assertRevert(principalProxy.proxyVote(voting.address, voteId, true, { from }), 'PV_VOTE_ALREADY_CASTED')
              })

              it('cannot be overruled by another representative', async () => {
                await principalProxy.setFullRepresentative(anotherRepresentative, true, { from: principal })
                await assertRevert(principalProxy.proxyVote(voting.address, voteId, true, { from: anotherRepresentative }), 'PV_VOTE_ALREADY_CASTED')
              })
            }

            context('when the representative is allowed for any vote instance', () => {
              beforeEach('allow representative for any instance', async () => {
                await principalProxy.setFullRepresentative(representative, true, { from: principal })
              })

              itCastsTheProxiedVote()
            })

            context('when the representative is allowed for that particular vote instance', () => {
              beforeEach('allow representative for instance', async () => {
                await principalProxy.setInstanceRepresentative(representative, voting.address, true, { from: principal })
              })

              itCastsTheProxiedVote()
            })

            context('when the representative is allowed for that particular vote', () => {
              beforeEach('allow representative for vote', async () => {
                await principalProxy.setVoteRepresentative(representative, voting.address, voteId, true, { from: principal })
              })

              itCastsTheProxiedVote()
            })
          })

          context('when within the overrule window', () => {
            beforeEach('move within overrule window', async () => {
              await increaseTime(VOTING_DURATION - OVERRULE_WINDOW)
            })

            const itReverts = () => {
              it('reverts', async () => {
                await assertRevert(principalProxy.proxyVote(voting.address, voteId, true, { from }), 'PV_WITHIN_OVERRULE_WINDOW')
              })
            }

            context('when the representative is allowed for any vote instance', () => {
              beforeEach('allow representative for any instance', async () => {
                await principalProxy.setFullRepresentative(representative, true, { from: principal })
              })

              itReverts()
            })

            context('when the representative is allowed for that particular vote instance', () => {
              beforeEach('allow representative for instance', async () => {
                await principalProxy.setInstanceRepresentative(representative, voting.address, true, { from: principal })
              })

              itReverts()
            })

            context('when the representative is allowed for that particular vote', () => {
              beforeEach('allow representative for vote', async () => {
                await principalProxy.setVoteRepresentative(representative, voting.address, voteId, true, { from: principal })
              })

              itReverts()
            })
          })
        })
      })

      context('when the representative is a proxy', () => {
        context('when the representative is not allowed', () => {
          const from = representative

          const itDoesNotProxyTheVote = () => {
            it('does not cast the vote', async () => {
              await representativeProxy.proxyVotes([voting.address], [voteId], [true], { from })

              const { yeas, nays } = await getVoteState()

              assert.equal(yeas.toString(), 0, 'yeas should be 0')
              assert.equal(nays.toString(), 0, 'nays should be 0')
              assert.equal(await getVoterState(principal), VOTER_STATE.ABSENT, 'principal should not have voted')
              assert.equal(await getVoterState(principalProxy.address), VOTER_STATE.ABSENT, 'principal proxy should not have voted yet')
            })
          }

          context('when the representative is not allowed at all', () => {
            itDoesNotProxyTheVote()
          })

          context('when the representative is allowed for a another vote instance', () => {
            beforeEach('allow representative for another instance', async () => {
              await principalProxy.setInstanceRepresentative(representativeProxy.address, anotherVoting, true, { from: principal })
            })

            itDoesNotProxyTheVote()
          })

          context('when the representative is allowed for a another vote', () => {
            beforeEach('allow representative for another vote', async () => {
              await principalProxy.setVoteRepresentative(representativeProxy.address, voting.address, voteId, true, { from: principal })
              await createVote()
            })

            itDoesNotProxyTheVote()
          })
        })

        context('when the representative is allowed', () => {
          const from = representative

          context('when not within the overrule window', () => {
            const itCastsTheProxiedVote = () => {
              context('when the sender is the representative', () => {
                beforeEach('proxy representative\'s vote', async () => {
                  await representativeProxy.proxyVotes([voting.address], [voteId], [false], { from: representative })
                })

                it('casts the proxied vote', async () => {
                  const { yeas, nays } = await getVoteState()

                  assert.equal(yeas.toString(), 0, 'yeas should be 0')
                  assert.equal(nays.toString(), bigExp(51, 18).toString(), 'nays should be 51%')
                  assert.equal(await getVoterState(principal), VOTER_STATE.ABSENT, 'principal proxy should have voted')
                  assert.equal(await getVoterState(principalProxy.address), VOTER_STATE.NAY, 'principal proxy should have voted')
                })

                it('cannot be changed by the same representative', async () => {
                  await assertRevert(representativeProxy.proxyVotes([voting.address], [voteId], [true], { from }), 'PV_VOTE_ALREADY_CASTED')
                })

                it('cannot be overruled by another representative', async () => {
                  await principalProxy.setFullRepresentative(anotherRepresentative, true, { from: principal })
                  await assertRevert(principalProxy.proxyVote(voting.address, voteId, true, { from: anotherRepresentative }), 'PV_VOTE_ALREADY_CASTED')
                })
              })

              context('when the sender is not the representative', () => {
                it('reverts', async () => {
                  await assertRevert(representativeProxy.proxyVotes([voting.address], [voteId], [false], { from: anyone }), 'RP_SENDER_NOT_REPRESENTATIVE')
                })
              })
            }

            context('when the representative is allowed for any vote instance', () => {
              beforeEach('allow representative for any instance', async () => {
                await principalProxy.setFullRepresentative(representativeProxy.address, true, { from: principal })
              })

              itCastsTheProxiedVote()
            })

            context('when the representative is allowed for that particular vote instance', () => {
              beforeEach('allow representative for instance', async () => {
                await principalProxy.setInstanceRepresentative(representativeProxy.address, voting.address, true, { from: principal })
              })

              itCastsTheProxiedVote()
            })

            context('when the representative is allowed for that particular vote', () => {
              beforeEach('allow representative for vote', async () => {
                await principalProxy.setVoteRepresentative(representativeProxy.address, voting.address, voteId, true, { from: principal })
              })

              itCastsTheProxiedVote()
            })
          })

          context('when within the overrule window', () => {
            beforeEach('move within overrule window', async () => {
              await increaseTime(VOTING_DURATION - OVERRULE_WINDOW)
            })

            const itReverts = () => {
              it('reverts', async () => {
                await assertRevert(representativeProxy.proxyVotes([voting.address], [voteId], [true], { from }), 'PV_WITHIN_OVERRULE_WINDOW')
              })
            }

            context('when the representative is allowed for any vote instance', () => {
              beforeEach('allow representative for any instance', async () => {
                await principalProxy.setFullRepresentative(representativeProxy.address, true, { from: principal })
              })

              itReverts()
            })

            context('when the representative is allowed for that particular vote instance', () => {
              beforeEach('allow representative for instance', async () => {
                await principalProxy.setInstanceRepresentative(representativeProxy.address, voting.address, true, { from: principal })
              })

              itReverts()
            })

            context('when the representative is allowed for that particular vote', () => {
              beforeEach('allow representative for vote', async () => {
                await principalProxy.setVoteRepresentative(representativeProxy.address, voting.address, voteId, true, { from: principal })
              })

              itReverts()
            })
          })
        })
      })
    })

    context('when the vote does not exist', () => {
      it('reverts', async () => {
        await principalProxy.setFullRepresentative(representativeProxy.address, true, { from: principal })
        await assertRevert(representativeProxy.proxyVotes([voting.address], [voteId], [true], { from: representative }), 'VOTING_NO_VOTE')
      })
    })
  })

  describe('vote', () => {
    beforeEach('create a vote', createVote)

    context('when the sender is the principal', () => {
      const from = principal

      const itCastsTheProxiedVote = () => {
        it('casts the proxied vote', async () => {
          await principalProxy.vote(voting.address, voteId, true, false, { from })

          const { yeas, nays } = await getVoteState()

          assert.equal(yeas.toString(), bigExp(51, 18).toString(), 'yeas should be 51%')
          assert.equal(nays.toString(), 0, 'nays should be 0')
          assert.equal(await getVoterState(principal), VOTER_STATE.ABSENT, 'principal proxy should have voted')
          assert.equal(await getVoterState(principalProxy.address), VOTER_STATE.YEA, 'principal proxy should have voted')
        })
      }

      context('when no one proxied a vote yet', () => {
        itCastsTheProxiedVote()
      })

      context('when a representative already proxied a vote', () => {
        beforeEach('proxy representative\'s vote', async () => {
          await principalProxy.setFullRepresentative(representativeProxy.address, true, { from: principal })
          await representativeProxy.proxyVote(voting.address, voteId, false, { from: representative })
        })

        itCastsTheProxiedVote()
      })

      context('when the principal already proxied a vote', () => {
        beforeEach('proxy principal\'s vote', async () => {
          await principalProxy.vote(voting.address, voteId, false, false, { from: principal })
        })

        itCastsTheProxiedVote()
      })
    })

    context('when the sender is not the principal', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(principalProxy.vote(voting.address, voteId, true, false, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('hasNotVoteYet', () => {
    beforeEach('create a vote', createVote)

    context('when no one has vote yet', () => {
      it('returns true', async () => {
        assert.isTrue(await principalProxy.hasNotVoteYet(voting.address, voteId))
      })
    })

    context('when a representative has proxied a vote', () => {
      beforeEach('proxy representative\'s vote', async () => {
        await principalProxy.setFullRepresentative(representativeProxy.address, true, { from: principal })
        await representativeProxy.proxyVote(voting.address, voteId, true, { from: representative })
      })

      it('returns false', async () => {
        assert.isFalse(await principalProxy.hasNotVoteYet(voting.address, voteId))
      })
    })

    context('when the principal has proxied a vote', () => {
      beforeEach('proxy principal\'s vote', async () => {
        await principalProxy.vote(voting.address, voteId, true, false, { from: principal })
      })

      it('returns false', async () => {
        assert.isFalse(await principalProxy.hasNotVoteYet(voting.address, voteId))
      })
    })
  })

  describe('withinOverruleWindow', () => {
    beforeEach('create a vote', createVote)

    context('when previous to the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(ONE_DAY)
      })

      it('returns false', async () => {
        assert.isFalse(await principalProxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when right at the beginning of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION - OVERRULE_WINDOW)
      })

      it('returns true', async () => {
        assert.isTrue(await principalProxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when in the middle of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION - OVERRULE_WINDOW/2 )
      })

      it('returns true', async () => {
        assert.isTrue(await principalProxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when right at the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION)
      })

      it('returns false', async () => {
        assert.isFalse(await principalProxy.withinOverruleWindow(voting.address, voteId))
      })
    })

    context('when after the end of the overrule window', () => {
      beforeEach('increase time', async () => {
        await increaseTime(VOTING_DURATION + 1)
      })

      it('returns false', async () => {
        assert.isFalse(await principalProxy.withinOverruleWindow(voting.address, voteId))
      })
    })
  })

  describe('withdraw', () => {
    context('when the sender is the principal', () => {
      const from = principal

      context('when the transfer succeeds', () => {
        const amount = bigExp(1, 18)

        it('transfers the requested amount of tokens to the principal', async () => {
          const previousProxyBalance = await token.balanceOf(principalProxy.address)
          const previousPrincipalBalance = await token.balanceOf(principal)

          await principalProxy.withdraw(token.address, amount, { from })

          const currentProxyBalance = await token.balanceOf(principalProxy.address)
          assert.equal(currentProxyBalance.toString(), previousProxyBalance.minus(amount).toString())

          const currentPrincipalBalance = await token.balanceOf(principal)
          assert.equal(currentPrincipalBalance.toString(), previousPrincipalBalance.plus(amount).toString())
        })

        it('emits an event', async () => {
          const receipt = await principalProxy.withdraw(token.address, amount, { from })

          assertAmountOfEvents(receipt, 'Withdraw')
          assertEvent(receipt, 'Withdraw', { token: token.address, amount })
        })
      })

      context('when the transfer does not succeed', () => {
        const amount = bigExp(100, 18)

        it('reverts', async () => {
          await assertRevert(principalProxy.withdraw(token.address, amount, { from }), 'PV_WITHDRAW_FAILED')
        })
      })
    })

    context('when the sender is not the principal', () => {
      const from = anyone

      it('reverts', async () => {
        await assertRevert(principalProxy.withdraw(token.address, 1, { from }), 'PV_SENDER_NOT_PRINCIPAL')
      })
    })
  })

  describe('registry', () => {
    const ProxyVotingRegistry = artifacts.require('ProxyVotingRegistry')

    it('creates proxy votings', async () => {
      const registry = await ProxyVotingRegistry.new()
      const receipt = await registry.newRepresentativeProxy({ from: representative })
      const representativeProxyAddress = getEventArgument(receipt, 'NewRepresentativeProxy', 'representativeProxy')

      assert(await registry.isValidRepresentativeProxy(representativeProxyAddress), 'representative proxy is not valid')
    })

    it('creates representatives proxies', async () => {
      const registry = await ProxyVotingRegistry.new()
      const receipt = await registry.newProxyVoting(OVERRULE_WINDOW, { from: principal })
      const proxyVotingAddress = getEventArgument(receipt, 'NewProxyVoting', 'proxyVoting')

      assert(await registry.isValidProxyVoting(proxyVotingAddress), 'proxy voting is not valid')
    })
  })
})
