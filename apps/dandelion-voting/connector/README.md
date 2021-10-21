# The Graph Connector for Dandelion Voting

## Usage

```js
const org = await connect(
  <org-address>,
  'thegraph',
  { chainId: <chain-id> }
)
const apps = await org.apps()
const dandelionVotingApp = apps.find(
  app => app.appName === 'dandelion-voting.aragonpm.eth'
)

const dandelionVotingInstance = new DandelionVoting(
  dandelionVotingApp.address,
  <subgraph-url>
)

const votes = await dandelionVotingInstance.votes()
```
