import DandelionVotingEntity from "./DandelionVotingEntity";
import Cast from './Cast'
import VotingConnectorTheGraph from "../connector";

export interface VoteData {
  id: string
  creator: string
  metadata: string
  executed: boolean
  startBlock: string
  executionBlock: string
  snapshotBlock: string
  supportRequiredPct: string
  minAcceptQuorum: string
  yea: string
  nay: string
  votingPower: string
  script: string
}

export default class Vote extends DandelionVotingEntity implements VoteData {
  readonly id!: string
  readonly creator!: string
  readonly metadata!: string
  readonly executed!: boolean
  readonly startBlock!: string
  readonly executionBlock!: string
  readonly snapshotBlock!: string
  readonly supportRequiredPct!: string
  readonly minAcceptQuorum!: string
  readonly yea!: string
  readonly nay!: string
  readonly votingPower!: string
  readonly script!: string

  constructor(data: VoteData, connector: VotingConnectorTheGraph) {
    super(connector)

    Object.assign(this, data)
  }

  async casts({ first = 1000, skip = 0 } = {}): Promise<Cast[]> {
    return this._connector.castsForVote(
      this.id,
      first,
      skip
    )
  }

  onCasts(callback: Function): { unsubscribe: Function } {
    return this._connector.onCastsForVote(
      this.id,
      callback
    )
  }
}
