import VotingConnectorTheGraph from "../connector";

export default class DandelionVotingEntity {
  protected _connector: VotingConnectorTheGraph

  constructor(connector: VotingConnectorTheGraph) {
    this._connector = connector
  }
}