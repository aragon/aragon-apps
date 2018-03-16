const devMigration = require('@aragon/templates-dev/migrations/2_deploy')

const Voting = artifacts.require('@aragon/apps-voting/contracts/Voting')
const Vault = artifacts.require('@aragon/apps-vault/contracts/Vault')
const TokenManager = artifacts.require('@aragon/apps-token-manager/contracts/TokenManager')

const EMPTY_SCRIPT = '0x00000001'

module.exports = async (deployer, network, accounts) => {
  const {
    daoAddr,
    ensAddr,
    tokenManagerAddr,
    vaultAddr,
    votingAddr,
  } = await devMigration(deployer, network, accounts, artifacts)

  const voting = Voting.at(votingAddr)
  const tokenManager = TokenManager.at(tokenManagerAddr)

  // Create a new vote
  const newVote = (question, from) => voting.newVote(
    EMPTY_SCRIPT,
    question,
    { from }
  )

  // Vote with an account
  const vote = (voteId, account, supports) =>
    voting.vote(voteId, supports, false, { from: account })

  // Assign some tokens so accounts can vote
  await Promise.all(
    [1e19 * 1, 1e19 * 1.4, 1e19 * 2, 1e19 * 5, 1e19 * 8].map((amount, i) => {
      const account = accounts[i]
      tokenManager.mint(account, amount)
      console.log(`Assigned ${account} ${amount} tokens`)
    })
  )

  const votesIds = await Promise.all([
    newVote('Messaging Platform: shall we move to Rocket.Chat?', accounts[1] ),
    newVote('Do you agree to share lorem ipsum?', accounts[1]),
    newVote('Fusce vehicula dolor arcu, sit amet blandit dolor mollis nec?', accounts[0]),
    newVote('Sed sollicitudin ipsum quis nunc sollicitudin ultrices?', accounts[1]),
  ]).then(receipts => receipts.map(({ logs }) => logs[0].args.voteId))
  console.log('Created demo votes')

  const votingReceipts = await Promise.all([
    vote(votesIds[0], accounts[2], false),
    vote(votesIds[0], accounts[3], false),
    vote(votesIds[0], accounts[4], true),

    vote(votesIds[2], accounts[0], true),

    vote(votesIds[3], accounts[0], false),
  ])
  console.log('Voted on demo votes')
}
