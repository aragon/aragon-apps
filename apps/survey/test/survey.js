const { assertRevert } = require('@aragon/test-helpers/assertThrow')
const { assertAmountOfEvents } = require('@aragon/test-helpers/assertEvent')(web3)
const { getEventAt, getEventArgument, getNewProxyAddress } = require('@aragon/test-helpers/events')
const getBlockNumber = require('@aragon/test-helpers/blockNumber')(web3)
const { makeErrorMappingProxy } = require('@aragon/test-helpers/utils')

const getContract = name => artifacts.require(name)
const pct16 = x => new web3.BigNumber(x).times(new web3.BigNumber(10).toPower(16))
const createdSurveyId = receipt => getEventArgument(receipt, 'StartSurvey', 'surveyId')

contract('Survey app', ([root, holder1, holder2, holder19, holder31, holder50, nonHolder]) => {
  let daoFact, dao, surveyBase, survey

  let ABSTAIN_VOTE, ANY_ENTITY
  let APP_MANAGER_ROLE, CREATE_SURVEYS_ROLE, MODIFY_PARTICIPATION_ROLE

  // Error strings
  const errors = makeErrorMappingProxy({
    // aragonOS errors
    APP_AUTH_FAILED: 'APP_AUTH_FAILED',
    INIT_ALREADY_INITIALIZED: 'INIT_ALREADY_INITIALIZED',
    INIT_NOT_INITIALIZED: 'INIT_NOT_INITIALIZED',
    RECOVER_DISALLOWED: 'RECOVER_DISALLOWED',

    // Survey errors
    SURVEY_MIN_PARTICIPATION: "SURVEY_MIN_PARTICIPATION",
    SURVEY_NO_SURVEY: "SURVEY_NO_SURVEY",
    SURVEY_NO_VOTING_POWER: "SURVEY_NO_VOTING_POWER",
    SURVEY_CAN_NOT_VOTE: "SURVEY_CAN_NOT_VOTE",
    SURVEY_VOTE_WRONG_INPUT: "SURVEY_VOTE_WRONG_INPUT",
    SURVEY_VOTE_WRONG_OPTION: "SURVEY_VOTE_WRONG_OPTION",
    SURVEY_NO_STAKE: "SURVEY_NO_STAKE",
    SURVEY_OPTIONS_NOT_ORDERED: "SURVEY_OPTIONS_NOT_ORDERED",
    SURVEY_NO_OPTION: "SURVEY_NO_OPTION"
  })

  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

  const SURVEY_APP_ID = '0x1234'
  const SURVEY_MOCK_APP_ID = '0x12341234'
  const minimumAcceptanceParticipationPct = pct16(20)
  const surveyTime = 1000

  before(async () => {
    const kernelBase = await getContract('Kernel').new(true) // petrify immediately
    const aclBase = await getContract('ACL').new()
    daoFact = await getContract('DAOFactory').new(kernelBase.address, aclBase.address, ZERO_ADDRESS)
    surveyBase = await getContract('SurveyMock').new()

    // Setup constants
    ANY_ENTITY = await aclBase.ANY_ENTITY()
    APP_MANAGER_ROLE = await kernelBase.APP_MANAGER_ROLE()
    ABSTAIN_VOTE = await surveyBase.ABSTAIN_VOTE()
    CREATE_SURVEYS_ROLE  = await surveyBase.CREATE_SURVEYS_ROLE()
    MODIFY_PARTICIPATION_ROLE  = await surveyBase.MODIFY_PARTICIPATION_ROLE()
  })

  beforeEach(async () => {
    const r = await daoFact.newDAO(root)
    dao = getContract('Kernel').at(getEventArgument(r, 'DeployDAO', 'dao'))
    const acl = getContract('ACL').at(await dao.acl())

    await acl.createPermission(root, dao.address, APP_MANAGER_ROLE, root, { from: root })

    const receipt = await dao.newAppInstance(SURVEY_APP_ID, surveyBase.address, '0x', false, { from: root })
    survey = getContract('SurveyMock').at(getNewProxyAddress(receipt))

    await acl.createPermission(ANY_ENTITY, survey.address, CREATE_SURVEYS_ROLE, root, { from: root })
    await acl.createPermission(ANY_ENTITY, survey.address, MODIFY_PARTICIPATION_ROLE, root, { from: root })
  })

  it('it should set permissions', async () => {
    //kernel = await getContract('Kernel').at(address);
    ;(await Promise.all([
      dao.hasPermission(ANY_ENTITY, survey.address, await survey.CREATE_SURVEYS_ROLE(), '0x0'),
      dao.hasPermission(ANY_ENTITY, survey.address, await survey.MODIFY_PARTICIPATION_ROLE(), '0x0'),
    ])).should.deep.equal([true, true])
  });

  context('normal token supply', () => {
    let token

    beforeEach(async () => {
      token = await getContract('MiniMeToken').new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

      await token.generateTokens(holder19, 19)
      await token.generateTokens(holder31, 31)
      await token.generateTokens(holder50, 50)

      await survey.initialize(token.address, minimumAcceptanceParticipationPct, surveyTime)
    })

    it('fails on reinitialization', async () => {
      await assertRevert(survey.initialize(token.address, minimumAcceptanceParticipationPct, surveyTime), errors.INIT_ALREADY_INITIALIZED)
    })

    it('cannot initialize base app', async () => {
      const newSurvey = await getContract('Survey').new()
      assert.isTrue(await newSurvey.isPetrified())
      await assertRevert(newSurvey.initialize(token.address, minimumAcceptanceParticipationPct, surveyTime), errors.INIT_ALREADY_INITIALIZED)
    })

    it('can change minimum acceptance participation', async () => {
      const receipt = await survey.changeMinAcceptParticipationPct(1)
      assertAmountOfEvents(receipt, 'ChangeMinParticipation')

      assert.equal(await survey.minParticipationPct(), 1, 'should have change acceptance participation')
    })

    it('cannot change minimum acceptance participation to 0', async () => {
      await assertRevert(survey.changeMinAcceptParticipationPct(0), errors.SURVEY_MIN_PARTICIPATION)
    })

    it('cannot change minimum acceptance participation to more than 100', async () => {
      await assertRevert(survey.changeMinAcceptParticipationPct(pct16(101)), errors.SURVEY_MIN_PARTICIPATION)
    })

    context('creating survey', () => {
      const optionsCount = 10e9 // lots of options
      let surveyId, creator, metadata

      beforeEach(async () => {
        ({ surveyId, creator, metadata } = getEventAt(await survey.newSurvey('metadata', optionsCount, { from: nonHolder }), 'StartSurvey').args)
      })

      it('has correct state', async () => {
        const [isOpen, startDate, snapshotBlock, minParticipationPct, votingPower, participation, options] = await survey.getSurvey(surveyId)

        assert.isTrue(isOpen, 'survey should be open')
        assert.equal(creator, nonHolder, 'creator should be correct')
        assert.equal(snapshotBlock, await getBlockNumber() - 1, 'snapshot block should be correct')
        assert.deepEqual(minParticipationPct, minimumAcceptanceParticipationPct, 'min participation should be survey min participation')
        assert.equal(votingPower, 100, 'voting power should be 100')
        assert.equal(participation, 0, 'initial participation should be 0') // didn't vote even though creator was holder
        assert.equal(options, optionsCount, 'number of options should be correct')
        assert.equal(metadata, 'metadata', 'should have returned correct metadata')
        const voterState = await survey.getVoterState(surveyId, nonHolder)
        assert.equal(voterState[0].length, 0, 'nonHolder should not have voted (options)')
        assert.equal(voterState[1].length, 0, 'nonHolder should not have voted (stakes)')
      })

      it('fails getting a survey out of bounds', async () => {
        await assertRevert(survey.getSurvey(surveyId + 1), errors.SURVEY_NO_SURVEY)
      })

      it('fails getting option power for a survey out of bounds', async () => {
        await assertRevert(survey.getOptionPower(surveyId + 1, 0), errors.SURVEY_NO_SURVEY)
      })

      it('fails getting option power for an option out of bounds', async () => {
        await assertRevert(survey.getOptionPower(surveyId, optionsCount + 1), errors.SURVEY_NO_OPTION)
      })

      describe('single option vote', () => {
        it('counts votes properly', async () => {
          await survey.voteOption(surveyId, 10, { from: holder31 })
          await survey.voteOption(surveyId, 11, { from: holder31 }) // h31 votes for option 11

          await survey.voteOption(surveyId, 12, { from: holder50 }) // h51 votes for option 12
          await survey.voteOption(surveyId, 1, { from: holder19 }) // h19 votes for option 1

          assert.equal(await survey.getOptionPower(surveyId, 1), 19)
          assert.equal(await survey.getOptionPower(surveyId, 10), 0)
          assert.equal(await survey.getOptionPower(surveyId, 11), 31)
          assert.equal(await survey.getOptionPower(surveyId, 12), 50)

          const state = await survey.getSurvey(surveyId)

          assert.equal(state[5], 100, 'participation should be 100')
        })

        /* next 2 tests check if isParticipationAchieved works properly
        * checking whether participation was above minimum set when survey
        * was created
        */
        it('accounts for achieved participation properly', async () => {
          await survey.voteOption(surveyId, 1, { from: holder31 })
          assert.isTrue(await survey.isParticipationAchieved(surveyId), 'participation achieved should be true')
        })

        it('accounts for non-achieved participation properly', async () => {
          await survey.voteOption(surveyId, 1, { from: holder19 })
          assert.isFalse(await survey.isParticipationAchieved(surveyId), 'participation achieved should be false')
        })

        it('fails if voting on non-existing option', async () => {
          await survey.voteOption(surveyId, optionsCount, { from: holder31 })

          await assertRevert(survey.voteOption(surveyId, optionsCount + 1, { from: holder31 }), errors.SURVEY_VOTE_WRONG_OPTION)
        })

        it('fails if single-option vote is for ABSTAIN_VOTE', async () => {
          await assertRevert(survey.voteOption(surveyId, ABSTAIN_VOTE, { from: holder50 }), errors.SURVEY_VOTE_WRONG_OPTION)
        })

        it('allows to remove and re-vote', async () => {
          await survey.voteOption(surveyId, 1, { from: holder50 })
          await survey.resetVote(surveyId, { from: holder50 })
          assert.equal(await survey.getOptionPower(surveyId, 1), 0)
          await survey.voteOption(surveyId, 100, { from: holder50 })

          assert.equal(await survey.getOptionPower(surveyId, 1), 0)
          assert.equal(await survey.getOptionPower(surveyId, 0), 0)
          assert.equal(await survey.getOptionPower(surveyId, 100), 50)
        })

        it('changing min participation doesnt affect survey min participation', async () => {
          await survey.changeMinAcceptParticipationPct(pct16(50))

          await survey.mockIncreaseTime(surveyTime + 1)

          const state = await survey.getSurvey(surveyId)
          assert.deepEqual(state[3], minimumAcceptanceParticipationPct, 'acceptance participation in survey should stay equal')
        })

        it('token transfers dont affect voting', async () => {
          await token.transfer(nonHolder, 31, { from: holder31 })

          await survey.voteOption(surveyId, 1, { from: holder31 })
          const optionSupport = await survey.getOptionPower(surveyId, 1)

          assert.equal(optionSupport, 31, 'vote should have been counted')
          assert.equal(await token.balanceOf(holder31), 0, 'balance should be 0 at current block')
        })

        it('fails when non-holder votes', async () => {
          await assertRevert(survey.voteOption(surveyId, 1, { from: nonHolder }), errors.SURVEY_CAN_NOT_VOTE)
        })

        it('fails when voting after survey closes', async () => {
          await survey.mockIncreaseTime(surveyTime + 1)
          await assertRevert(survey.voteOption(surveyId, 1, { from: holder31 }), errors.SURVEY_CAN_NOT_VOTE)
        })
      })

      describe('multi option votes', () => {
        it('casts complete multi option vote', async () => {
          await survey.voteOptions(surveyId, [1,2], [10, 21], { from: holder31 })
          const voterState = await survey.getVoterState(surveyId, holder31)
          assert.equal(voterState[0][0].toString(), ABSTAIN_VOTE, "First option should be NO VOTE")
          assert.equal(voterState[1][0].toString(), 0, "NO VOTE stake doesn't match")
          assert.equal(voterState[0][1].toString(), 1, "First voted option doesn't match")
          assert.equal(voterState[1][1].toString(), 10, "First voted stake doesn't match")
          assert.equal(voterState[0][2].toString(), 2, "Second voted option doesn't match")
          assert.equal(voterState[1][2].toString(), 21, "Second voted stake doesn't match")
        })

        it('casts incomplete multi option vote', async () => {
          // 10 = 20 = 30, 1 vote missing
          await survey.voteOptions(surveyId, [1,2], [10, 20], { from: holder31 })
          const voterState = await survey.getVoterState(surveyId, holder31)
          assert.equal(voterState[0][0].toString(), ABSTAIN_VOTE, "First option should be NO VOTE")
          assert.equal(voterState[1][0].toString(), 1, "NO VOTE stake doesn't match")
          assert.equal(voterState[0][1].toString(), 1, "First voted option doesn't match")
          assert.equal(voterState[1][1].toString(), 10, "First voted stake doesn't match")
          assert.equal(voterState[0][2].toString(), 2, "Second voted option doesn't match")
          assert.equal(voterState[1][2].toString(), 20, "Second voted stake doesn't match")
        })

        it('fails if multi option vote has different size arrays', async () => {
          await assertRevert(survey.voteOptions(surveyId, [1,2], [10, 10, 11], { from: holder31 }), errors.SURVEY_VOTE_WRONG_INPUT)
        })

        it('fails if multi option vote has unordered options', async () => {
          await assertRevert(survey.voteOptions(surveyId, [2,1], [10, 21], { from: holder31 }), errors.SURVEY_OPTIONS_NOT_ORDERED)
        })

        it('fails if multi option vote has ABSTAIN_VOTE option', async () => {
          await assertRevert(survey.voteOptions(surveyId, [ABSTAIN_VOTE, 2], [10, 21], { from: holder31 }), errors.SURVEY_VOTE_WRONG_OPTION)
        })

        it('fails if multi option vote has a zero stake option', async () => {
          await assertRevert(survey.voteOptions(surveyId, [1,2], [10, 0], { from: holder31 }), errors.SURVEY_NO_STAKE)
        })

        it('fails if multi option vote includes non-existent option', async () => {
          await assertRevert(survey.voteOptions(surveyId, [optionsCount + 1], [10], { from: holder31 }), errors.SURVEY_VOTE_WRONG_OPTION)
        })

        it('fails if multi option vote does not include any options', async () => {
          await assertRevert(survey.voteOptions(surveyId, [], [], { from: holder50 }), errors.SURVEY_VOTE_WRONG_INPUT)
        })

        it('fails when non-holder votes', async () => {
          await assertRevert(survey.voteOptions(surveyId, [1], [1], { from: nonHolder }), errors.SURVEY_CAN_NOT_VOTE)
        })

        it('fails when voting after survey closes', async () => {
          await survey.mockIncreaseTime(surveyTime + 1)
          await assertRevert(survey.voteOptions(surveyId, [1], [1], { from: holder31 }), errors.SURVEY_CAN_NOT_VOTE)
        })
      })
    })
  })

  context('wrong initializations', () => {
    let token

    beforeEach(async () => {
      token = await getContract('MiniMeToken').new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

      await token.generateTokens(holder19, 19)
      await token.generateTokens(holder31, 31)
      await token.generateTokens(holder50, 50)
    })

    it('fails if min acceptance participation is 0', async () => {
      const badMinimumAcceptanceParticipationPct = pct16(0)
      await assertRevert(survey.initialize(token.address, badMinimumAcceptanceParticipationPct, surveyTime), errors.SURVEY_MIN_PARTICIPATION)
    })

    it('fails if min participation is greater than 100', async () => {
      const badMinimumAcceptanceParticipationPct = pct16(101)
      await assertRevert(survey.initialize(token.address, badMinimumAcceptanceParticipationPct, surveyTime), errors.SURVEY_MIN_PARTICIPATION)
    })
  })

  context('before init', () => {
    it('fails creating a survey before initialization', async () => {
      await assertRevert(survey.newSurvey('metadata', 10), errors.APP_AUTH_FAILED)
    })
  })

  context('empty token', () => {
    beforeEach(async() => {
      const badToken = await getContract('MiniMeToken').new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime
      await survey.initialize(badToken.address, minimumAcceptanceParticipationPct, surveyTime)
    })

    it('fails creating a survey if token has no holder', async () => {
      await assertRevert(survey.newSurvey('metadata', 10), errors.SURVEY_NO_VOTING_POWER)
    })
  })

  context('wrong supply token', () => {
    beforeEach(async() => {
      const badToken = await getContract('BadToken').new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime
      await badToken.generateTokens(holder19, 19)
      await survey.initialize(badToken.address, minimumAcceptanceParticipationPct, surveyTime)
    })

    // this bad token has broken `totalSupplyAt`, returning always 1
    it('fails voting with more than 1 token because of wrong votingPower', async () => {
      const surveyId = createdSurveyId(await survey.newSurvey('metadata', 10))
      await assertRevert(survey.voteOption(surveyId, 10, { from: holder19 }))
    })
  })

  context('changing token supply', () => {
    let surveyMockBase, token

    before(async () => {
      surveyMockBase = await getContract('SurveyMock').new()
    })

    beforeEach(async () => {
      token = await getContract('MiniMeToken').new(ZERO_ADDRESS, ZERO_ADDRESS, 0, 'n', 0, 'n', true) // empty parameters minime

      await token.generateTokens(holder1, 1)
      await token.generateTokens(holder2, 1)

      const receipt = await dao.newAppInstance(SURVEY_MOCK_APP_ID, surveyMockBase.address, '0x', false, { from: root })
      survey = getContract('SurveyMock').at(getNewProxyAddress(receipt))

      const acl = getContract('ACL').at(await dao.acl())
      await acl.createPermission(ANY_ENTITY, survey.address, CREATE_SURVEYS_ROLE, root, { from: root })
      await acl.createPermission(ANY_ENTITY, survey.address, MODIFY_PARTICIPATION_ROLE, root, { from: root })

      await survey.initialize(token.address, minimumAcceptanceParticipationPct, surveyTime)
    })

    it('uses the correct snapshot value if tokens are minted afterwards', async () => {
      // Create survey and afterwards generate some tokens
      const surveyId = createdSurveyId(await survey.newSurvey('metadata', 10))
      await token.generateTokens(holder2, 1)

      const [isOpen, startDate, snapshotBlock, minParticipationPct, votingPower, participation, options] = await survey.getSurvey(surveyId)

      // Generating tokens advanced the block by one
      assert.equal(snapshotBlock.toString(), await getBlockNumber() - 2, 'snapshot block should be correct')
      assert.equal(votingPower.toString(), (await token.totalSupplyAt(snapshotBlock)).toString(), 'voting power should match snapshot supply')
      assert.equal(votingPower.toString(), 2, 'voting power should be correct')
    })

    it('uses the correct snapshot value if tokens are minted in the same block', async () => {
      // Create survey and generate some tokens in the same transaction
      // Requires the survey mock to be the token's owner
      await token.changeController(survey.address)
      const surveyId = createdSurveyId(await survey.newTokenAndSurvey(holder2, 1, 'metadata', 10))

      const [isOpen, startDate, snapshotBlock, minParticipationPct, votingPower, participation, options] = await survey.getSurvey(surveyId)

      assert.equal(snapshotBlock.toString(), await getBlockNumber() - 1, 'snapshot block should be correct')
      assert.equal(votingPower.toString(), (await token.totalSupplyAt(snapshotBlock)).toString(), 'voting power should match snapshot supply')
      assert.equal(votingPower.toString(), 2, 'voting power should be correct')
    })
  })
})
