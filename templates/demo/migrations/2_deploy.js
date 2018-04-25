const devMigration = require('@aragon/templates-dev/migrations/2_deploy')

const Finance = artifacts.require('@aragon/apps-finance/contracts/Finance')
const TokenManager = artifacts.require('@aragon/apps-token-manager/contracts/TokenManager')
const Vault = artifacts.require('@aragon/apps-vault/contracts/Vault')
const Voting = artifacts.require('@aragon/apps-voting/contracts/Voting')

const MinimeToken = artifacts.require('@aragon/os/contracts/lib/minime/MinimeToken')

const EMPTY_SCRIPT = '0x00000001'

module.exports = async (deployer, network, accounts) => {
  const {
    daoAddr,
    ensAddr,
    financeAddr,
    tokenManagerAddr,
    vaultAddr,
    votingAddr,
  } = await devMigration(deployer, network, accounts, artifacts)

  const finance = Finance.at(financeAddr)
  const tokenManager = TokenManager.at(tokenManagerAddr)
  const voting = Voting.at(votingAddr)

  const tokenAddr = await tokenManager.token()
  const token = MinimeToken.at(tokenAddr)

  // Create a new vote
  const newVote = (question, from) => voting.newVote(
    EMPTY_SCRIPT,
    question,
    { from }
  )

  // Vote with an account
  const vote = (voteId, account, supports) =>
    voting.vote(voteId, supports, false, { from: account })

  // Create a deposit
  const newDeposit = async (from, amount, ref) => {
    await token.approve(financeAddr, amount, { from })
    return finance.deposit(tokenAddr, amount, ref, { from })
  }

  // Create a new payment
  const newPayment = (to, amount, ref) =>
    // Immediate, no interval, one-time payment
    finance.newPayment(tokenAddr, to, amount, 0, 0, 1, ref, { from })

  // Assign some tokens to accounts for voting and transferring
  const tokenAssignments = [1e19 * 1, 1e19 * 1.4, 1e19 * 2, 1e19 * 5, 1e19 * 8]
  await Promise.all(
    tokenAssignments.map((amount, i) => {
      const account = accounts[i]
      console.log(`Assigned ${account} ${amount} tokens`)
      return tokenManager.mint(account, amount)
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

  const tokenDeposits = tokenAssignments.map(amount => Math.floor(amount * Math.random() / 2))
  await Promise.all(
    tokenDeposits.map((amount, i) => {
      const account = accounts[i]
      const invoiceRef = `Invoice IN${i}`
      console.log(`${invoiceRef}: ${account} deposited ${amount}`)
      return newDeposit(account, amount, invoiceRef)
    })
  )
  await Promise.all(
    [0, 1].map(i => {
      const amount = Math.floor(tokenDeposits[i] * Math.random() / 3)
      const paymentRef = `Transfer ${i}`
      console.log(`${paymentRef}: payment of ${amount} to ${accounts[1]}`)
    })
  )
}
