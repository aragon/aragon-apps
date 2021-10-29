# Token Oracle <img align="right" src="https://github.com/1Hive/website/blob/master/website/static/img/bee.png" height="80px" />

The Token Oracle app is an [ACL Oracle](https://hack.aragon.org/docs/acl_IACLOracle). ACL Oracles are small helper functions that plug in to Aragon's access control list (ACL) to do more sophisticated permission evaluation. In the context of Dandelion Orgs, the Token Oracle is used to check if an address holds Dandelion Org tokens and is thus a member of the organization. This is done by setting a minimum required balance in the Token Oracle. Then when an account submits the intent to perform an action on an Aragon app function whose ROLE is protected behind this Oracle, the ACL will check with the Oracle if the account has the minimum balance of tokens required. The Token Oracle will return a boolean which can be used to either approve or reject the intent.

#### 🚨 Security review status: Contracts frozen for audit as of commit [a9ae2edf9d7654b5a5b8135f49d081dc229c4d30](https://github.com/1Hive/token-oracle/tree/a9ae2edf9d7654b5a5b8135f49d081dc229c4d30/contracts)

The code in this repo has not been audited.

## How does it work?

The Token Oracle app is initialized with the address of an ERC-20 token and a minimum balance. It has setters for both of these parameters. Other applications can then "query" through the ACL, the Token Oracle to determine if an account has at least the minimum balance of the token that the Token Oracle is tracking.

## Initialization

The Token Oracle is initialized with `address _token` and `uint256 _minBalance` parameters.
- The `address _token` parameter is the address of the token that Token Oracle is to track.
- The `uint256 _minBalance` is the minimum balance of `address _token` that an account needs to hold.

## Roles

The Token Oracle app should implement the following roles:
- **SET_TOKEN_ROLE**: This allows for changing the token address that the Token Oracle tracks.
- **SET_MIN_BALANCE_ROLE**: This allows for changing the threshold at which the Token Oracle returns a true or false boolean.

## Interface

The Token Oracle does not have an interface. It is meant as a back-end helper function for Aragon applications to perform more sophisticated permissions evaluation.

## How to run Token Oracle locally

The Token Oracle works in tandem with other Aragon applications. While we do not explore this functionality as a stand alone demo, the [Dandelion Org template](https://github.com/1Hive/dandelion-org) uses the Token Oracle and it can be run locally.

## Deploying to an Aragon DAO

TBD

## Contributing

We welcome community contributions!

Please check out our [open Issues](https://github.com/1Hive/token-oracle/issues) to get started.

If you discover something that could potentially impact security, please notify us immediately. The quickest way to reach us is via the #dev channel in our [team Keybase chat](https://1hive.org/contribute/keybase). Just say hi and that you discovered a potential security vulnerability and we'll DM you to discuss details.
