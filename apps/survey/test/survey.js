const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)
const timeTravel = require('@aragon/test-helpers/timeTravel')(web3)

const getContract = name => artifacts.require(name)
const pct16 = x => new web3.BigNumber(x).times(new web3.BigNumber(10).toPower(16))
const createdSurveyId = receipt => receipt.logs.filter(x => x.event == 'StartSurvey')[0].args.surveyId

contract('Survey app', accounts => {
  let app
  const surveyTime = 1000
  const holder19 = accounts[0]
  const holder31 = accounts[1]
  const holder50 = accounts[2]
  const nonHolder = accounts[4]

  beforeEach(async () => {
    app = await getContract('Surveying').new()
  })

  context('normal token supply', () => {
    let token

    const minimumAcceptanceParticipationPct = pct16(20)

    beforeEach(async () => {
      const n = '0x00'
      token = await getContract('MiniMeToken').new(n, n, 0, 'n', 0, 'n', true) // empty parameters minime

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
      assert.equal(await app.minAcceptParticipationPct(), 1, 'should have change acceptance participation')
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
        assert.equal(await app.getVoterState(surveyId, nonHolder), 0, 'nonHolder should not have voted')
      })

      it('counts votes properly', async () => {
        await app.voteOption(surveyId, 10, { from: holder31 })
        await app.voteOption(surveyId, 11, { from: holder31 }) // h31 votes for option 11

        await app.voteOption(surveyId, 12, { from: holder50 }) // h51 votes for option 12
        await app.voteOption(surveyId, 1, { from: holder19 }) // h19 votes for option 1

        assert.equal(await app.getOptionSupport(surveyId, 1), 19)
        assert.equal(await app.getOptionSupport(surveyId, 10), 0)
        assert.equal(await app.getOptionSupport(surveyId, 11), 31)
        assert.equal(await app.getOptionSupport(surveyId, 12), 50)

        const state = await app.getSurvey(surveyId)

        assert.equal(state[6], 100, 'participation should de 100')

      })

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

      it('allows to remove and re-vote', async () => {
        await app.voteOption(surveyId, 1, { from: holder50 })
        await app.voteOption(surveyId, 0, { from: holder50 })
        await app.voteOption(surveyId, 100, { from: holder50 })

        assert.equal(await app.getOptionSupport(surveyId, 1), 0)
        assert.equal(await app.getOptionSupport(surveyId, 0), 0)
        assert.equal(await app.getOptionSupport(surveyId, 100), 50)
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
        const optionSupport = await app.getOptionSupport(surveyId, 1)

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

      it('fails if voting the same option', async () => {
        await app.voteOption(surveyId, 1, { from: holder31 })
        return assertRevert(async () => {
          await app.voteOption(surveyId, 1, { from: holder31 })
        })
      })
    })
  })

  context('wrong initializations', () => {
    let token

    beforeEach(async () => {
      const n = '0x00'
      token = await getContract('MiniMeToken').new(n, n, 0, 'n', 0, 'n', true) // empty parameters minime

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
      const n = '0x00'
      const minimumAcceptanceParticipationPct = pct16(20)

      badApp = await getContract('Surveying').new()
      badToken = await getContract('MiniMeToken').new(n, n, 0, 'n', 0, 'n', true) // empty parameters minime
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
})
