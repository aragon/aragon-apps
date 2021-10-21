## Token Balance Oracle

The Token Oracle app is an [ACL Oracle](https://hack.aragon.org/docs/acl_IACLOracle). ACL Oracles are small helper functions that plug in to Aragon's access control list (ACL) to do more sophisticated permission evaluation. In the context of Dandelion Orgs, the Token Oracle is used to check if an address holds Dandelion Org tokens and is thus a member of the organization. This is done by setting a minimum required balance in the Token Oracle. Then when an account submits the intent to perform an action on an Aragon app function whose ROLE is protected behind this Oracle, the ACL will check with the Oracle if the account has the minimum balance of tokens required. The Token Oracle will return a boolean which can be used to either approve or reject the intent.

<br />

## External Contract Dependencies

The Token Oracle app relies on the following external libraries.

### Audited External Contracts

These contracts have been audited by 3rd parties. Information on past Aragon audits can be found at the following locations:

- https://github.com/aragon/security-review/blob/master/past-reports.md
- https://wiki.aragon.org/association/security/

```
import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/acl/IACLOracle.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
```

<br />

## Roles and Permissions

The Token Balance Oracle has the following roles:

```
bytes32 public constant SET_TOKEN_ROLE = keccak256("SET_TOKEN_ROLE");
bytes32 public constant SET_MIN_BALANCE_ROLE = keccak256("SET_MIN_BALANCE_ROLE");
```

These roles can be set to another Aragon app or an individual address. We recommend the following permissions:

- `SET_TOKEN_ROLE` => Voting app
- `SET_MIN_BALANCE_ROLE` => Voting app

<br />

## Key Concepts

The Token Oracle does not have an interface. It is meant as a back-end helper function for Aragon applications to perform more sophisticated permissions evaluation.

More information on Aragon oracles can be found [here](https://hack.aragon.org/docs/acl_IACLOracle#docsNav).

<br />

## Globally Scoped Variables

The following variables are globally scoped in the Token Balance oracle.

```
// the address of the token contract to check
ERC20 public token;
// the minimum balanance needed for a query to the oracle to return true
uint256 public minBalance;
```

<br />

## Events

Events are emitted when the following functions are called.

```
// the token address has been changed
event TokenSet(address token);
// the minimum balanance needed for a query to the oracle to return true has been changed
event MinimumBalanceSet(uint256 minBalance);
```

<br />

## Initialization

The Token Balance oracle is initialized with the following parameters

```
// initializing the token balance oracle sets the token contract to query and the minimum balance needed to return true
function initialize(address _token, uint256 _minBalance) external onlyInit {
		require(isContract(_token), ERROR_TOKEN_NOT_CONTRACT);

		token = ERC20(_token);
		minBalance = _minBalance;

		initialized();
}
```

<br />

## setToken

`setToken` sets the token contract address to track. The address supplied must be an Ethereum contract. An event is emitted every time this parameter is set.

```
/**
* @notice Update token address to `_token`
* @param _token The new token address
*/
function setToken(address _token) external auth(SET_TOKEN_ROLE) {
		require(isContract(_token), ERROR_TOKEN_NOT_CONTRACT);
		token = ERC20(_token);

		emit TokenSet(_token);
}
```

<br />

## setMinBalance`

`setMinBalance` sets the minimum balance that is required for the Token Balance to return true. An event is emitted every time this parameter is set.

```
/**
* @notice Update minimum balance to `_minBalance`
* @param _minBalance The new minimum balance
*/
function setMinBalance(uint256 _minBalance) external auth(SET_MIN_BALANCE_ROLE) {
		minBalance = _minBalance;

		emit MinimumBalanceSet(_minBalance);
}
```

<br />

## canPerform

`canPerform` returns true if the address specified in the `_how` parameter has a balance greater than or equal to the `minBalance` set in the Token Balance oracle. `_how` is just an array that can contain data.
It is expected that the data contained is the address to check. In order for this to happen the function protected by a role with this ACL Oracle, should specify the address in the `autP` modifier as `autP(SOME_ROLE, sender)`

Checks are performed on the data in the [0] position of the array to make sure that it is a valid address, then the token balance of that address is checked, then a boolean is returned stating whether the token balance is greater than or equal to the `minBalance` parameter set in the Token Balance oracle or not.

More information on Aragon oracles and the `_how` parameter can be found [here](https://hack.aragon.org/docs/acl_IACLOracle).

```
/**
* @notice ACLOracle
* @dev IACLOracle interface conformance.  The ACLOracle permissioned function should specify the sender
*     with 'authP(SOME_ACL_ROLE, arr(sender))', typically set to 'msg.sender'.
*/
function canPerform(address, address, bytes32, uint256[] _how) external view returns (bool) {
		require(_how.length > 0, ERROR_SENDER_MISSING);
		require(_how[0] < 2**160, ERROR_SENDER_TOO_BIG);
		require(_how[0] != 0, ERROR_SENDER_ZERO);

		address sender = address(_how[0]);

		uint256 senderBalance = token.balanceOf(sender);
		return senderBalance >= minBalance;
}
```

<br />

## Questions, Comments, and Concerns

If you'd like to talk to us about this contract, please reach out to our team on the [1Hive Keybase chat](https://keybase.io/team/1hive).

<br />
