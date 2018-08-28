const { assertInvalidOpcode, assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)
const timeTravel = require('@aragon/test-helpers/timeTravel')(web3)

const getContract = name => artifacts.require(name)
const pct16 = x => new web3.BigNumber(x).times(new web3.BigNumber(10).toPower(16))
const createdSurveyId = receipt => receipt.logs.filter(x => x.event == 'StartSurvey')[0].args.surveyId

contract('Survey app', accounts => {
  let app, ABSTAIN_VOTE
  const surveyTime = 1000
  const holder19 = accounts[0]
  const holder31 = accounts[1]
  const holder50 = accounts[2]
  const nonHolder = accounts[4]
  const NULL_ADDRESS = '0x00'

  beforeEach(async () => {
    app = await getContract('SurveyMock').new()
    ABSTAIN_VOTE = await app.ABSTAIN_VOTE()
  })

  context('normal token supply', () => {
    let token

    const minimumAcceptanceParticipationPct = pct16(20)

    beforeEach(async () => {
      token = await getContract('MiniMeToken').new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

      await token.generateTokens(holder19, 19)
      await token.generateTokens(holder31, 31)
      await token.generateTokens(holder50, 50)

      await app.initialize(token.address, minimumAcceptanceParticipationPct, surveyTime)

    })

    it('fails on reinitialization', async () => {
      return assertRevert(async () => {
        await app.initialize(token.address, minimumAcceptanceParticipationPct, surveyTime)
      })
    })

    it('can change minimum acceptance participation', async () => {
      const receipt = await app.changeMinAcceptParticipationPct(1)
      const events = receipt.logs.filter(x => x.event == 'ChangeMinParticipation')

      assert.equal(events.length, 1, 'should have emitted ChangeMinParticipation event')
      assert.equal(await app.minParticipationPct(), 1, 'should have change acceptance participation')
    })

    it('cannot change minimum acceptance participation to 0', async () => {
      return assertRevert(async () => {
        const receipt = await app.changeMinAcceptParticipationPct(0)
      })
    })

    it('cannot change minimum acceptance participation to more than 100', async () => {
      return assertRevert(async () => {
        const receipt = await app.changeMinAcceptParticipationPct(pct16(101))
      })
    })

    context('creating survey', () => {
      let surveyId = {}
      let optionsCount = 10e9 // lots of options

      beforeEach(async () => {
        surveyId = createdSurveyId(await app.newSurvey('metadata', optionsCount, { from: nonHolder }))
      })

      it('has correct state', async () => {
        const [isOpen, creator, startDate, snapshotBlock, minParticipationPct, totalVoters, participation, options] = await app.getSurvey(surveyId)

        assert.isTrue(isOpen, 'survey should be open')
        assert.equal(creator, nonHolder, 'creator should be correct')
        assert.equal(snapshotBlock, await getBlockNumber() - 1, 'snapshot block should be correct')
        assert.deepEqual(minParticipationPct, minimumAcceptanceParticipationPct, 'min participation should be app min participation')
        assert.equal(totalVoters, 100, 'total voters should be 100')
        assert.equal(participation, 0, 'initial participation should be 0') // didn't vote even though creator was holder
        assert.equal(options, optionsCount, 'number of options should be correct')
        assert.equal(await app.getSurveyMetadata(surveyId), 'metadata', 'should have returned correct metadata')
        const voterState = await app.getVoterState(surveyId, nonHolder)
        assert.equal(voterState[0].length, 0, 'nonHolder should not have voted (options)')
        assert.equal(voterState[1].length, 0, 'nonHolder should not have voted (stakes)')
      })

      it('counts votes properly', async () => {
        await app.voteOption(surveyId, 10, { from: holder31 })
        await app.voteOption(surveyId, 11, { from: holder31 }) // h31 votes for option 11

        await app.voteOption(surveyId, 12, { from: holder50 }) // h51 votes for option 12
        await app.voteOption(surveyId, 1, { from: holder19 }) // h19 votes for option 1

        assert.equal(await app.getOptionPower(surveyId, 1), 19)
        assert.equal(await app.getOptionPower(surveyId, 10), 0)
        assert.equal(await app.getOptionPower(surveyId, 11), 31)
        assert.equal(await app.getOptionPower(surveyId, 12), 50)

        const state = await app.getSurvey(surveyId)

        assert.equal(state[6], 100, 'participation should be 100')

      })

      /* next 2 tests check if isParticipationAchieved works properly
       * checking whether participation was above minimum set when survey
       * was created
       */
      it('accounts for achieved participation properly', async () => {
        await app.voteOption(surveyId, 1, { from: holder31 })
        assert.isTrue(await app.isParticipationAchieved(surveyId), 'participation achieved should be true')
      })

      it('accounts for non-achieved participation properly', async () => {
        await app.voteOption(surveyId, 1, { from: holder19 })
        assert.isFalse(await app.isParticipationAchieved(surveyId), 'participation achieved should be false')
      })

      it('fails if voting on non-existing option', async () => {
        await app.voteOption(surveyId, optionsCount, { from: holder31 })

        return assertRevert(async () => {
          await app.voteOption(surveyId, optionsCount + 1, { from: holder31 })
        })
      })

      it('fails if vote has no options', async () => {
        return assertRevert(async () => {
          await app.voteOptions(surveyId, [], [], { from: holder50 })
        })
      })

      it('fails if single-option vote is for ABSTAIN_VOTE', async () => {
        return assertRevert(async () => {
          await app.voteOption(surveyId, ABSTAIN_VOTE, { from: holder50 })
        })
      })

      it('allows to remove and re-vote', async () => {
        await app.voteOption(surveyId, 1, { from: holder50 })
        await app.resetVote(surveyId, { from: holder50 })
        assert.equal(await app.getOptionPower(surveyId, 1), 0)
        await app.voteOption(surveyId, 100, { from: holder50 })

        assert.equal(await app.getOptionPower(surveyId, 1), 0)
        assert.equal(await app.getOptionPower(surveyId, 0), 0)
        assert.equal(await app.getOptionPower(surveyId, 100), 50)
      })

      it('changing min participation doesnt affect survey min participation', async () => {
        await app.changeMinAcceptParticipationPct(pct16(50))

        await timeTravel(surveyTime + 1)

        const state = await app.getSurvey(surveyId)
        assert.deepEqual(state[4], minimumAcceptanceParticipationPct, 'acceptance participation in survey should stay equal')
      })

      it('token transfers dont affect voting', async () => {
        await token.transfer(nonHolder, 31, { from: holder31 })

        await app.voteOption(surveyId, 1, { from: holder31 })
        const optionSupport = await app.getOptionPower(surveyId, 1)

        assert.equal(optionSupport, 31, 'vote should have been counted')
        assert.equal(await token.balanceOf(holder31), 0, 'balance should be 0 at current block')
      })

      it('throws when non-holder votes', async () => {
        return assertRevert(async () => {
          await app.voteOption(surveyId, 1, { from: nonHolder })
        })
      })

      it('throws when voting after survey closes', async () => {
        await timeTravel(surveyTime + 1)
        return assertRevert(async () => {
          await app.voteOption(surveyId, 1, { from: holder31 })
        })
      })

      it('casts complete multi option vote', async () => {
        await app.voteOptions(surveyId, [1,2], [10, 21], { from: holder31 })
        const voterState = await app.getVoterState(surveyId, holder31)
        assert.equal(voterState[0][0].toString(), ABSTAIN_VOTE, "First option should be NO VOTE")
        assert.equal(voterState[1][0].toString(), 0, "NO VOTE stake doesn't match")
        assert.equal(voterState[0][1].toString(), 1, "First voted option doesn't match")
        assert.equal(voterState[1][1].toString(), 10, "First voted stake doesn't match")
        assert.equal(voterState[0][2].toString(), 2, "Second voted option doesn't match")
        assert.equal(voterState[1][2].toString(), 21, "Second voted stake doesn't match")
      })

      it('casts incomplete multi option vote', async () => {
        // 10 = 20 = 30, 1 vote missing
        await app.voteOptions(surveyId, [1,2], [10, 20], { from: holder31 })
        const voterState = await app.getVoterState(surveyId, holder31)
        assert.equal(voterState[0][0].toString(), ABSTAIN_VOTE, "First option should be NO VOTE")
        assert.equal(voterState[1][0].toString(), 1, "NO VOTE stake doesn't match")
        assert.equal(voterState[0][1].toString(), 1, "First voted option doesn't match")
        assert.equal(voterState[1][1].toString(), 10, "First voted stake doesn't match")
        assert.equal(voterState[0][2].toString(), 2, "Second voted option doesn't match")
        assert.equal(voterState[1][2].toString(), 20, "Second voted stake doesn't match")
      })

      it('fails if multi option vote has different size arrays', async () => {
        return assertRevert(async () => {
          await app.voteOptions(surveyId, [1,2], [10, 10, 11], { from: holder31 })
        })
      })

      it('fails if multi option vote has unordered options', async () => {
        return assertRevert(async () => {
          await app.voteOptions(surveyId, [2,1], [10, 21], { from: holder31 })
        })
      })

      it('fails if multi option vote has NO VOTE option', async () => {
        return assertRevert(async () => {
          await app.voteOptions(surveyId, [ABSTAIN_VOTE, 2], [10, 21], { from: holder31 })
        })
      })

      it('fails if multi option vote has a zero stake option', async () => {
        return assertRevert(async () => {
          await app.voteOptions(surveyId, [1,2], [10, 0], { from: holder31 })
        })
      })
    })
  })

  context('wrong initializations', () => {
    let token

    beforeEach(async () => {
      token = await getContract('MiniMeToken').new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

      await token.generateTokens(holder19, 19)
      await token.generateTokens(holder31, 31)
      await token.generateTokens(holder50, 50)
    })

    it('fails if min acceptance participation is 0', () => {
      const minimumAcceptanceParticipationPct = pct16(0)
      return assertRevert(async() => {
        await app.initialize(token.address, minimumAcceptanceParticipationPct, surveyTime)
      })
    })

    it('fails if min participation is greater than 100', () => {
      const minimumAcceptanceParticipationPct = pct16(101)
      return assertRevert(async() => {
        await app.initialize(token.address, minimumAcceptanceParticipationPct, surveyTime)
      })
    })
  })

  context('empty token', () => {
    let badApp, badToken

    before(async() => {
      const minimumAcceptanceParticipationPct = pct16(20)

      badApp = await getContract('SurveyMock').new()
      badToken = await getContract('MiniMeToken').new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime
      await badApp.initialize(badToken.address, minimumAcceptanceParticipationPct, surveyTime)
    })

    it('fails creating a survey if token has no holder', async () => {
      return assertRevert(async () => {
        await badApp.newSurvey('metadata', 10)
      })
    })
  })

  context('before init', () => {
    it('fails creating a survey before initialization', async () => {
      return assertRevert(async () => {
        await app.newSurvey('metadata', 10)
      })
    })
  })

  context('wrong supply token', () => {
    let badApp, badToken

    before(async() => {
      const minimumAcceptanceParticipationPct = pct16(20)

      badApp = await getContract('SurveyMock').new()
      badToken = await getContract('BadToken').new(NULL_ADDRESS, NULL_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime
      await badToken.generateTokens(holder19, 19)
      await badApp.initialize(badToken.address, minimumAcceptanceParticipationPct, surveyTime)
    })

    // this bad token has broken `totalSupplyAt`, returning always 1
    it('fails voting with more than 1 token because of wrong votingPower', async () => {
      const surveyId = createdSurveyId(await badApp.newSurvey('metadata', 10))
      return assertInvalidOpcode(async () => {
        await badApp.voteOption(surveyId, 10, { from: holder19 })
      })
    })
  })
})
