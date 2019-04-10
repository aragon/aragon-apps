The Voting app is an entity that will execute a set of actions on other entities
if token holders of a particular token decide to do so.

## App initialization

The Voting app is instantiated with a certain set of parameters that won’t be
changeable for the lifetime of the app:

- Token: address of the MiniMe token whose holders have voting power
  proportional to their holdings.
- Support required: what % of the votes need to be positive for the vote to be
  executed. Making it 50% would be a 'simple democracy'.
- Minimum acceptance quorum: minimum % of all token supply that needs to
  approve in order for the voting to be executed.
- Voting time: number of seconds a vote will be opened, if not closed
  prematurely for outstanding support.

The only parameter that can be changed is 'Minimum acceptance quorum' for
protecting against the case in which there is not enough voter turnout.
