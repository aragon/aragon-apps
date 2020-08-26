const deployer = require('../helpers/deployer')(web3, artifacts)
const { createVote } = require('../helpers/voting')

const { bigExp } = require('@aragon/contract-helpers-test')

contract('Voting', ([_, owner, voter]) => {
  let voting, token, agreement, voteId, actionId, receipt

  before('deploy and sign agreement', async () => {
    agreement = await deployer.deployAgreement({ owner })
    await agreement.sign({ from: voter })
  })

  before('mint vote tokens', async () => {
    token = await deployer.deployToken({})
    await token.generateTokens(voter, bigExp(100, 18))
  })

  beforeEach('create voting app', async () => {
    voting = await deployer.deployAndInitialize({ owner })
  })

  beforeEach('create vote', async () => {
    ({ voteId, receipt } = await createVote({ voting, from: voter }))
    actionId = (await voting.getVote(voteId)).actionId
  })

  describe('gas costs', () => {
    const itCostsAtMost = (expectedCost, call) => {
      it(`should cost up to ${expectedCost.toLocaleString()} gas [ @skip-on-coverage ]`, async () => {
        const { receipt: { gasUsed } } = await call()
        console.log(`gas costs: ${gasUsed.toLocaleString()}`)
        assert.isAtMost(gasUsed, expectedCost)
      })
    }

    context('newVote', () => {
      itCostsAtMost(343e3, async () => receipt)
    })

    context('vote', () => {
      itCostsAtMost(123e3, async () => await voting.vote(voteId, true, { from: voter }))
    })

    context('challenge', () => {
      itCostsAtMost(350e3, async () => (await agreement.challenge({ actionId })).receipt)
    })
  })
})
