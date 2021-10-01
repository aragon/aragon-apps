import { VotingConnectorTheGraph, Vote, Cast } from '..'

const VOTING_SUBGRAPH_URL =
  'https://api.thegraph.com/subgraphs/name/1hive/aragon-dandelion-voting-rinkeby'
const VOTING_APP_ADDRESS = '0x03112f62df4eb73d92594b8d474feac103005fb5'

describe('when connecting to a voting app', () => {
  let connector: VotingConnectorTheGraph

  beforeAll(() => {
    connector = new VotingConnectorTheGraph(VOTING_SUBGRAPH_URL)
  })

  describe('when querying for all the votes of a voting app', () => {
    let votes: Vote[]

    beforeAll(async () => {
      votes = await connector.votesForApp(VOTING_APP_ADDRESS, 1000, 0)
    })

    test('returns a list of votes', () => {
      expect(votes.length).toBeGreaterThan(0)
    })

    describe('when looking at a vote', () => {
      let vote0: Vote
      let vote1: Vote

      beforeAll(() => {
        vote0 = votes[0]
        vote1 = votes[1]
      })

      test('should not be executed', () => {
        expect(vote0.executed).toBe(false)
        expect(vote1.executed).toBe(false)
      })

      test('should have nays', () => {
        expect(vote0.nay).toBe('50000000000000000000')
      })

      test('should have yeas', () => {
        expect(vote0.yea).toBe('1300000000000000000000')
      })

      test('has the expected script', () => {
        expect(vote1.script).toEqual(
          '0x00000001cf958ed4ed66eb02a8b398e740da2c55424d531200000024bf6eec160000000000000000000000000000000000000000000000000000000000000000'
        )
      })

      test('should have a valid creator', () => {
        expect(vote0.creator).toEqual(
          '0xee96d5d1383d20014a27ec523cebfdc359dd4663'
        )
      })

      test('should have valid metadata', () => {
        expect(vote0.metadata).toEqual(`Can you vote?`)
      })

      test('should have a valid minAcceptQuorum', () => {
        expect(vote0.minAcceptQuorum).toEqual('2800000000000000000000')
      })

      test('should have a valid supportRequiredPct', () => {
        expect(vote0.supportRequiredPct).toEqual('10000000000000000')
      })

      test('should have a valid votingPower', () => {
        expect(vote0.votingPower).toEqual('500000000000000000')
      })

      test('should have a valid snapshotBlock', () => {
        expect(vote0.startBlock).toEqual('6376718')
      })

      test('should have a valid snapshotBlock', () => {
        expect(vote0.snapshotBlock).toEqual('6376717')
      })

      describe('when querying for the casts of a vote0', () => {
        let casts: Cast[]

        beforeAll(async () => {
          casts = await vote1.casts()
        })

        test('retrieves casts', () => {
          expect(casts.length).toBeGreaterThan(0)
        })
      })
    })
  })
})
