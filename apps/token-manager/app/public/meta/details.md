Token Manager is an abstraction layer over the concept of the MiniMeToken
controller. The controller of a MiniMeToken is an address that can mint and
destroy tokens, it also gets a 'hook' call on every transfer and approval
giving the controller the chance to note it and decide whether to let the
transfer through.

Its most important features are minting new tokens and locking token
transferability over time (vesting).

One Token Manager instance can manage one MiniMe token.

## Modes

Token Manager can handle two modes or use-cases. The mode is set on initialization and cannot be changed.

- Native token mode: The managed token can be minted arbitrarily.
- Wrapped token mode: The managed token acts as a wrapper to another ERC20 token. The managed token can only be minted by staking (wrapping) units of the wrapped token. At any time a holder of the wrapper token can exchange it back for the original token (unless there is vesting).
