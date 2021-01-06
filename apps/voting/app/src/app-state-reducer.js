import BN from 'bn.js'
import { hasLoadedVoteSettings } from './vote-settings'
import { Percentage, TokenAmount } from './math-utils'

function appStateReducer(state) {
  const ready = hasLoadedVoteSettings(state)

  if (!ready) {
    return { ...state, ready }
  }

  const {
    pctBase,
    tokenDecimals,
    voteTime,
    votes,
    connectedAccountVotes,
  } = state

  const pctBaseBn = new BN(pctBase)
  const pctBaseNum = parseInt(pctBase, 10)
  const tokenDecimalsNum = parseInt(tokenDecimals, 10)
  const tokenDecimalsBaseNum = Math.pow(10, tokenDecimalsNum)

  return {
    ...state,

    ready,
    pctBase: pctBaseBn,
    tokenDecimals: new BN(tokenDecimals),
    connectedAccountVotes: connectedAccountVotes || {},

    // Transform the vote data for the frontend
    votes: votes
      ? votes.map(vote => {
          const { data } = vote
          return {
            ...vote,
            data: {
              ...data,
              executionDate: data.executionDate && new Date(data.executionDate),
              endDate: new Date(data.startDate + voteTime),
              minAcceptQuorum: new Percentage(data.minAcceptQuorum, pctBaseBn),
              startDate: new Date(data.startDate),
              supportRequired: new Percentage(data.supportRequired, pctBaseBn),
              votingPower: new TokenAmount(data.votingPower, tokenDecimals),
              yea: new TokenAmount(data.yea, tokenDecimals),
              nay: new TokenAmount(data.nay, tokenDecimals),
            },
          }
        })
      : [],
  }
}

export default appStateReducer
