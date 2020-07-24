const votingDeployer = require('../helpers/deployer')(web3, artifacts)
const agreementDeployer = require('@aragon/apps-agreement/test/helpers/utils/deployer')(web3, artifacts)
const { createVote } = require('../helpers/voting')

const { ONE_DAY, bigExp } = require('@aragon/contract-helpers-test')

contract('Voting', ([_, owner, voter]) => {
  let voting, token, agreement, voteId, actionId, collateralToken, receipt


  before('deploy agreement and base voting', async () => {
    agreement = await agreementDeployer.deployAndInitializeAgreementWrapper({ owner })
    collateralToken = await agreementDeployer.deployCollateralToken()
    votingDeployer.previousDeploy = agreementDeployer.previousDeploy

    await agreement.sign(voter)
    await votingDeployer.deployBase({ owner, agreement: true })
  })

  before('mint vote tokens', async () => {
    token = await votingDeployer.deployToken({})
    await token.generateTokens(voter, bigExp(100, 18))
  })

  beforeEach('create voting app', async () => {
    voting = await votingDeployer.deployAndInitialize({ owner, agreement: true })
    await voting.mockSetTimestamp(await agreement.currentTimestamp())

    const SET_AGREEMENT_ROLE = await voting.SET_AGREEMENT_ROLE()
    await votingDeployer.acl.createPermission(agreement.address, voting.address, SET_AGREEMENT_ROLE, owner, { from: owner })
    await agreement.activate({ disputable: voting, collateralToken, actionCollateral: 0, challengeCollateral: 0, challengeDuration: ONE_DAY, from: owner })
  })

  beforeEach('create vote', async () => {
    ({ voteId, receipt } = await createVote({ voting, from: voter }))
    actionId = (await voting.getVote(voteId)).actionId
  })

  describe('gas costs', () => {
    const itCostsAtMost = (expectedCost, call) => {
      it(`should cost up to ${expectedCost.toLocaleString()} gas`, async () => {
        const { receipt: { gasUsed } } = await call()
        console.log(`gas costs: ${gasUsed.toLocaleString()}`)
        assert.isAtMost(gasUsed, expectedCost)
      })
    }

    context('newVote', () => {
      itCostsAtMost(344e3, async () => receipt)
    })

    context('vote', () => {
      itCostsAtMost(122e3, async () => await voting.vote(voteId, true, { from: voter }))
    })

    context('challenge', () => {
      itCostsAtMost(350e3, async () => (await agreement.challenge({ actionId })).receipt)
    })
  })
})
