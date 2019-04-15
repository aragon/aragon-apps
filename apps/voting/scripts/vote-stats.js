/*
Usage:
$ APP_ADDRESS=[voting app addr] VOTE_ID=[vote id for analysis] npx truffle exec --network mainnet scripts/vote-stats.js

Will save a file name `vote-[id].csv` the current directory.
*/

const fs = require('fs')

const Voting = artifacts.require('Voting')
const MiniMeToken = artifacts.require('MiniMeToken')

const appAddress = process.env.APP_ADDRESS || '0xcfee4d3078f74197ce77120dbfe6d35f443cab1c'
const voteId = process.env.VOTE_ID || '0'

const tenPow = x => web3.toBigNumber(10).pow(x)
const formatNumber = (number, decimals) => number.div(tenPow(decimals)).toString()

const getTransaction = hash => (
  new Promise((resolve, reject) => {
    web3.eth.getTransaction(hash, (err, tx) => {
      if (err) {
        return reject(err)
      }

      resolve(tx)
    })
  })
)

module.exports = async (cb) => {
  const voting = Voting.at(appAddress)

  const [
    isOpen,
    isExecuted,
    startDate,
    snapshotBlock,
    supportRequired,
    minQuorum,
    y,
    n,
    votingPower,
    execScript
  ] = await voting.getVote(voteId)

  const token = MiniMeToken.at(await voting.token())
  const decimals = await token.decimals()

  const fromBlock = snapshotBlock.toString()

  voting.CastVote({ voteId }, { fromBlock }).get(async (err, votes) => {
    if (err) {
      throw err
    }

    const headerKeys = [
      'Voter address',
      'Supports',
      'Stake',
      'Block number',
      'Transaction hash',
      'Used Aragon client'
    ]

    const proccessedVotes = await Promise.all(votes.map(async ({ transactionHash, args }) => {
      const { voter, supports, stake } = args
      const { blockNumber, input } = await getTransaction(transactionHash)
      return [
        voter,
        supports,
        formatNumber(stake, decimals),
        blockNumber,
        transactionHash,
        input.endsWith('1') // Did they use the client to vote?
      ]
    }))

    const csvData = [headerKeys, ...proccessedVotes]
    const csvText = csvData.map(data => data.join(',')).join('\n')

    const filename = `vote-${voteId}.csv`
    fs.appendFile(filename, csvText, function (err) {
      if (err) {
        throw err
      }

      console.log('Saved', filename)
      cb()
    })
  })
}
