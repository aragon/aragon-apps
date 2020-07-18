// $ npx truffle exec --network mainnet scripts/agp-round-1.js

const Voting = artifacts.require('Voting')

// An array of strings for the questions whose calldata is being generated
const questions = []

const script = '0x'
const castVote = false
const executeIfDecided = false

module.exports = async (cb) => {
    // the address doesnt matter as we are only generating the calldata
    const voting = await Voting.at('0xcafE1A77e84698c83CA8931F54A755176eF75f2C')
    const newVoteRequest = voting.contract.newVote['bytes,string,bool,bool'].request

    const calldata = questions.map(
        question => newVoteRequest(script, question, castVote, executeIfDecided).params[0].data
    )

    console.log(calldata)

    cb()
}
