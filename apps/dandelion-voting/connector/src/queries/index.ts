import gql from 'graphql-tag'

export const ALL_VOTES = (type: string) => gql`
  ${type} Votes($appAddress: String!, $first: Int!, $skip: Int!) {
    votes(where: {
      appAddress: $appAddress
    }, first: $first, skip: $skip) {
      id
      appAddress
      orgAddress
      creator
      metadata
      executed
      startBlock
      executionBlock
      snapshotBlock
      supportRequiredPct
      minAcceptQuorum
      yea
      nay
      votingPower
      script
    }
  }
`

export const CASTS_FOR_VOTE = (type: string) => gql`
  ${type} Casts($voteId: ID!, $first: Int!, $skip: Int!) {
    casts(where: {
      voteId: $voteId
    }, first: $first, skip: $skip) {
      id
      voteId
      voteNum
      voter
      supports
      voterStake
    }
  }
`
