import { GraphQLWrapper } from '@aragon/connect-thegraph'
import * as queries from './queries'
import Vote from './entities/Vote'
import Cast from './entities/Cast'
import { parseVotes, parseCasts } from './parsers'

export default class VotingConnectorTheGraph extends GraphQLWrapper {
  async votesForApp(appAddress: string, first: number, skip: number): Promise<Vote[]> {
    return this.performQueryWithParser(
      queries.ALL_VOTES('query'),
      { appAddress, first, skip },
      parseVotes
    )
  }

  onVotesForApp(appAddress: string, callback: Function): { unsubscribe: Function } {
    return this.subscribeToQueryWithParser(
      queries.ALL_VOTES('subscription'),
      { appAddress, first: 1000, skip: 0 },
      callback,
      parseVotes
    )
  }

  async castsForVote(voteId: string, first: number, skip: number): Promise<Cast[]> {
    return this.performQueryWithParser(
      queries.CASTS_FOR_VOTE('query'),
      { voteId, first, skip },
      parseCasts
    )
  }

  onCastsForVote(voteId: string, callback: Function): { unsubscribe: Function } {
    return this.subscribeToQueryWithParser(
      queries.CASTS_FOR_VOTE('subscription'),
      { voteId, first: 1000, skip: 0 },
      callback,
      parseCasts
    )
  }
}
