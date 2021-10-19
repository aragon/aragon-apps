import { Observable } from 'rxjs'
import buildStubbedApiReact from '../../../shared/api-react'
import { ETHER_TOKEN_FAKE_ADDRESS } from '../../../shared/lib/token-utils'

const initialState = process.env.NODE_ENV !== 'production' && {
  token: ETHER_TOKEN_FAKE_ADDRESS,
  voteTime: 60000,
  PCT_BASE: 1e18,
  globalCandidateSupportPct: 0,
  globalMinQuorum: 50e16,
  entries: [],
  votes: [],
}

const functions = process.env.NODE_ENV !== 'production' && ((appState, setAppState) => ({
  createVote: ({
    description = 'Define the budget allocation for 2020 ops',
    type = 'allocation'
  } = {}) => setAppState({
    ...appState,
    votes: [
      ...appState.votes,
      {
        voteId: String(appState.votes.length + 1),
        data: {
          balance: 10e18,
          creator: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
          executionTargetData: {
            address: '0x3d9f32b8bc14167dacbc895d78c9acaae979e554',
            iconSrc: 'https://ipfs.eth.aragon.network/ipfs/QmRsGHLj3mLPmY3Niohh5LqqawPh2GHzgdKoWsy3uztQwC/meta/icon.svg',
            identifier: 'allocations',
            name: 'Allocations',
          },
          metadata: description,
          minAcceptQuorum: 0,
          options: [{
            label: '0xcaaacaaacaaacaaacaaacaaacaaacaaacaaacaaa',
            value: '0',
          }, {
            label: '0xdaaadaaadaaadaaadaaadaaadaaadaaadaaadaaa',
            value: '0',
          }],
          participationPct: 0,
          snapshotBlock: -1,
          startDate: new Date().getTime(),
          tokenSymbol: 'ETH',
          totalVoters: 300e18,
          type,
        }
      }
    ]
  }),
  call: (fn, ...args) => {
    switch (fn) {
    case 'getVoterState': {
      // const [ voteId, connectedAccount ] = args
      return new Observable(subscriber => {
        // TODO: return connectedAccount's votes for voteId
        subscriber.next([])
        subscriber.complete()
      })
    }
    case 'canVote': {
      return new Observable(subscriber => {
        subscriber.next(true)
        subscriber.complete()
      })
    }
    default:
      throw new Error(
        `Dot Voting is stubbing 'call', but 'call(${fn}, ${
          args.join(', ')})' is not yet stubbed!`
      )
    }
  }
}))

const { AragonApi, useAragonApi, useNetwork } = buildStubbedApiReact({ initialState, functions })

export { AragonApi, useAragonApi, useNetwork }
