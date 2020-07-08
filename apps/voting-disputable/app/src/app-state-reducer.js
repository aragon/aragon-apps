import BN from 'bn.js'
import { hasLoadedVoteSettings } from './vote-settings'

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

  const pctBaseNum = parseInt(pctBase, 10)
  const tokenDecimalsNum = parseInt(tokenDecimals, 10)
  const tokenDecimalsBaseNum = Math.pow(10, tokenDecimalsNum)

  return {
    ...state,

    ready,
    pctBase: new BN(pctBase),
    tokenDecimals: new BN(tokenDecimals),

    numData: {
      pctBase: pctBaseNum,
      tokenDecimals: tokenDecimalsNum,
    },

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
              minAcceptQuorum: new BN(data.minAcceptQuorum),
              nay: new BN(data.nay),
              startDate: new Date(data.startDate),
              supportRequired: new BN(data.supportRequired),
              votingPower: new BN(data.votingPower),
              yea: new BN(data.yea),
            },
            numData: {
              minAcceptQuorum: parseInt(data.minAcceptQuorum, 10) / pctBaseNum,
              nay: parseInt(data.nay, 10) / tokenDecimalsBaseNum,
              supportRequired: parseInt(data.supportRequired, 10) / pctBaseNum,
              votingPower:
                parseInt(data.votingPower, 10) / tokenDecimalsBaseNum,
              yea: parseInt(data.yea, 10) / tokenDecimalsBaseNum,
            },
          }
        })
      : [],
  }
}

export default appStateReducer
