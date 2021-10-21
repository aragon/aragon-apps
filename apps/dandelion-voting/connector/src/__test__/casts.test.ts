import { VotingConnectorTheGraph, Cast } from '..'

const VOTING_SUBGRAPH_URL =
  'https://api.thegraph.com/subgraphs/name/1hive/aragon-dandelion-voting-rinkeby'
const VOTING_APP_ADDRESS = '0x03112f62df4eb73d92594b8d474feac103005fb5'

describe('when connecting to a voting app', () => {
  let connector: VotingConnectorTheGraph

  beforeAll(() => {
    connector = new VotingConnectorTheGraph(VOTING_SUBGRAPH_URL)
  })

  describe('when getting the first cast of a vote', () => {
    let cast: Cast

    beforeAll(async () => {
      const votes = await connector.votesForApp(VOTING_APP_ADDRESS, 1000, 0)

      const vote = votes[0]

      const casts = await vote.casts()
      cast = casts[0]
    })

    test('was done by the correct voter', () => {
      expect(cast.voter).toBe('0x01e7f16e17c50d070eb66787f25ce3be405d6038')
    })
    test('was done by the correct voter', () => {
      expect(cast.voterStake).toBe('1000000000000000000000')
    })

    test('shows the correct support', () => {
      expect(cast.supports).toBe(true)
    })
  })
})
