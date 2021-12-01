<br />

## Overview

1Hive's Token Request app allows users to create requests for Organization's tokens in exchange for payment. For example a user may request minting 100 organization tokens in exchange for 100 DAI. The request would require a vote to approve, if the vote is rejected the user would be able to withdraw the request and recieve their payment back and if it is approved, the payment would be deposited in the organization's vault and Organization's tokens minted.

When a user makes a request they should transfer the payment to the Token Request app which will hold them in escrow while the vote is created and executed. If the vote duration passes and the payment is still in the Token Request app, the user should be able to claim **their** tokens. If the vote passes then executing the vote should transfer the user's payment from the token request app to the organization's vault, and mint tokens from the tokens app for the user.

<br />

## Hard Coded Global Parameters

We have this hard maximum to prevent OOG issues. Since we iterate over an array, there is risk that if it reachs a size that is too big to iterate over within the gas limit, however unlikely, the contract could become locked.

- `MAX_ACCEPTED_DEPOSIT_TOKENS` is the maximum amount of tokens that can be added to the `_acceptedDepositTokens` array. This array defines which tokens are and are not accepted for token deposits by the DAO.

```
uint256 public constant MAX_ACCEPTED_DEPOSIT_TOKENS = 100;
```

<br />

## Token Request Struct

This is the format of token requests.

```
enum Status { Pending, Refunded, Finalised }

struct TokenRequest {
	address requesterAddress;
	address depositToken;
	uint256 depositAmount;
	uint256 requestAmount;
	Status status;
}
```

<br />

## User Defined Global Variables

These variables are available in the global scope of the contract, but can be changed via the contract's functions.

- `tokenManager` is an Aragon [Token Manager](https://wiki.aragon.org/dev/apps/token-manager/)
- `vault` is an Aragon [Vault](https://wiki.aragon.org/dev/apps/vault/)
- `acceptedDepositTokens` is a dynamically sized array that holds the addresses of token contracts
- `nextTokenRequestId` is the id that the next token request created will have.
- `tokenRequests` is a mapping between a `uint256` and a `TokenRequest` struct. This holds all requests ever created.

```
TokenManager public tokenManager;
address public vault;

address[] public acceptedDepositTokens;

uint256 public nextTokenRequestId;
mapping(uint256 => TokenRequest) public tokenRequests; // ID => TokenRequest
```

<br />

## Initialization

The token request app is initialized by passing the address of a `_tokenManager` instance, the address of a `_vault` instance, and an array of addresses `_acceptedDepositTokens`. The `_acceptedDepositTokens` array must be less than the `MAX_ACCEPTED_DEPOSIT_TOKENS` variable which is set to 100.

```
function initialize(address _tokenManager, address _vault, address[] _acceptedDepositTokens) external onlyInit {
		require(isContract(_tokenManager), ERROR_ADDRESS_NOT_CONTRACT);
		// require that the amount of token contract addresses in `_acceptedDepositTokens` is less than `MAX_ACCEPTED_DEPOSIT_TOKENS`
		require(_acceptedDepositTokens.length <= MAX_ACCEPTED_DEPOSIT_TOKENS, ERROR_TOO_MANY_ACCEPTED_TOKENS);

		// check that the all addresses in the list of accepted deposited tokens are contracts
		for (uint256 i = 0; i < _acceptedDepositTokens.length; i++) {
				address acceptedDepositToken = _acceptedDepositTokens[i];
				if (acceptedDepositToken != ETH) {
						require(isContract(acceptedDepositToken), ERROR_ADDRESS_NOT_CONTRACT);
				}
		}

		// initialize parameters
		tokenManager = TokenManager(_tokenManager);
		vault = _vault;
		acceptedDepositTokens = _acceptedDepositTokens;

		// call `initialized()` so that the function cannot be called again
		initialized();
}
```

<br />

## Setters

The initialization parameters can be changed with the following functions:

```
/**
* @notice Set the Token Manager to `_tokenManager`.
* @param _tokenManager The new token manager address
*/
function setTokenManager(address _tokenManager) external auth(SET_TOKEN_MANAGER_ROLE) {
		tokenManager = TokenManager(_tokenManager);
		emit SetTokenManager(_tokenManager);
}

/**
* @notice Set the Vault to `_vault`.
* @param _vault The new vault address
*/
function setVault(address _vault) external auth(SET_VAULT_ROLE) {
		vault = _vault;
		emit SetVault(_vault);
}

/**
* @notice Add `_token.symbol(): string` to the accepted deposit token request tokens
* @param _token token address
*/
function addToken(address _token) external auth(MODIFY_TOKENS_ROLE) {
		require(!acceptedDepositTokens.contains(_token), ERROR_TOKEN_ALREADY_ACCEPTED);
		require(acceptedDepositTokens.length < MAX_ACCEPTED_DEPOSIT_TOKENS, ERROR_TOO_MANY_ACCEPTED_TOKENS);

		if (_token != ETH) {
				require(isContract(_token), ERROR_ADDRESS_NOT_CONTRACT);
		}

		acceptedDepositTokens.push(_token);

		emit TokenAdded(_token);
}

/**
* @notice Remove `_token.symbol(): string` from the accepted deposit token request tokens
* @param _token token address
*/
function removeToken(address _token) external auth(MODIFY_TOKENS_ROLE) {
		require(acceptedDepositTokens.deleteItem(_token), ERROR_TOKEN_NOT_ACCEPTED);

		emit TokenRemoved(_token);
}
```

< br />

## Creating a Token Request

When a user creates a new token request they can choose the deposit token, the amount of tokens they want to deposit, and how much of the DAO's native token they'd like to request in exchange.

> Note: The user can deposit an unlimited amount of tokens. A user can also request as many of the DAO's native token as they want. `MAX_ACCEPTED_DEPOSIT_TOKENS` is a parameter that controls the maximum amount of tokens the DAO can accept as deposit for requests, not the amount of tokens a user can deposit or request.

```
/**
* @notice Create a token request depositing `@tokenAmount(_depositToken, _depositAmount, true, 18)` in exchange for `@tokenAmount(self.getToken(): address, _requestAmount, true, 18)`
* @param _depositToken Address of the token being deposited
* @param _depositAmount Amount of the token being deposited
* @param _requestAmount Amount of the token being requested
* @param _reference String detailing request reason
*/
function createTokenRequest(address _depositToken, uint256 _depositAmount, uint256 _requestAmount, string _reference)
external
payable
returns (uint256)
{
		// require that the deposit token is accepted by the DAO
		require(acceptedDepositTokens.contains(_depositToken), ERROR_TOKEN_NOT_ACCEPTED);

		// logic to accept ETH or an ERC-20 token
		if (_depositToken == ETH) {
				require(msg.value == _depositAmount, ERROR_ETH_VALUE_MISMATCH);
		} else {
				require(ERC20(_depositToken).safeTransferFrom(msg.sender, address(this), _depositAmount), ERROR_TOKEN_TRANSFER_REVERTED);
		}

		// create a new TokenRequest and add it to the tokenRequests array
		uint256 tokenRequestId = nextTokenRequestId;
		nextTokenRequestId++;

		tokenRequests[tokenRequestId] = TokenRequest(msg.sender, _depositToken, _depositAmount, _requestAmount, Status.Pending);

		// emit an event
		emit TokenRequestCreated(tokenRequestId, msg.sender, _depositToken, _depositAmount, _requestAmount, _reference);

		// return the tokenRequestId
		return tokenRequestId;
}
```

<br />

## Refund Token Request

Allows a user to request a refund for a token request. The user must supply the `tokenRequestId` of the request they wish to have refunded. The user must be the owner of this request.

```
/**
* @notice Refund the deposit for token request with id `_tokenRequestId` to the creators account.
* @param _tokenRequestId ID of the Token Request
*/
function refundTokenRequest(uint256 _tokenRequestId) external nonReentrant tokenRequestExists(_tokenRequestId) {
		TokenRequest storage tokenRequest = tokenRequests[_tokenRequestId];
		require(tokenRequest.requesterAddress == msg.sender, ERROR_NOT_OWNER);
		require(tokenRequest.status == Status.Pending, ERROR_NOT_PENDING);

		tokenRequest.status = Status.Refunded;

		address refundToAddress = tokenRequest.requesterAddress;
		address refundToken = tokenRequest.depositToken;
		uint256 refundAmount = tokenRequest.depositAmount;

		if (refundAmount > 0) {
				if (refundToken == ETH) {
						(bool success, ) = refundToAddress.call.value(refundAmount)();
						require(success, ERROR_ETH_TRANSFER_FAILED);
				} else {
						require(ERC20(refundToken).safeTransfer(refundToAddress, refundAmount), ERROR_TOKEN_TRANSFER_REVERTED);
				}
		}

		emit TokenRequestRefunded(_tokenRequestId, refundToAddress, refundToken, refundAmount);
}
```

<br />

## Finalize Token Request

To accept a token request `finalizeTokenRequest()` needs to be called by passing in the `tokenRequestId` of the token request to finalize. This moves the token deposit to the DAO's vault, and transfers the requested amount of the DAO's tokens to the token requester.

```
/**
* @notice Finalise the token request with id `_tokenRequestId`, minting the requester funds and moving payment
					to the vault.
* @dev This function's FINALISE_TOKEN_REQUEST_ROLE permission is typically given exclusively to a forwarder.
*      This function requires the MINT_ROLE permission on the TokenManager specified.
* @param _tokenRequestId ID of the Token Request
*/
function finaliseTokenRequest(uint256 _tokenRequestId)
		external
		nonReentrant
		tokenRequestExists(_tokenRequestId)
		auth(FINALISE_TOKEN_REQUEST_ROLE)
{
		TokenRequest storage tokenRequest = tokenRequests[_tokenRequestId];
		require(tokenRequest.status == Status.Pending, ERROR_NOT_PENDING);

		// set request as finalized
		tokenRequest.status = Status.Finalised;

		// initialize parameters from the token request
		address requesterAddress = tokenRequest.requesterAddress;
		address depositToken = tokenRequest.depositToken;
		uint256 depositAmount = tokenRequest.depositAmount;
		uint256 requestAmount = tokenRequest.requestAmount;

		// logic to handle depositing the ETH or ERC-20 tokens into the DAO's vault
		if (depositAmount > 0) {

				if (depositToken == ETH) {
						(bool success, ) = vault.call.value(depositAmount)();
						require(success, ERROR_ETH_TRANSFER_FAILED);
				} else {
						require(ERC20(depositToken).safeTransfer(vault, depositAmount), ERROR_TOKEN_TRANSFER_REVERTED);
				}
		}

		// mint the requested amount of the DAO's native tokens for the token requestee
		tokenManager.mint(requesterAddress, requestAmount);

		// emit an event that the token request is finalized
		emit TokenRequestFinalised(_tokenRequestId, requesterAddress, depositToken, depositAmount, requestAmount);
}
```

<br />

## Getters

These get various values from the contract.

```
function getAcceptedDepositTokens() public view returns (address[]) {
		return acceptedDepositTokens;
}

function getTokenRequest(uint256 _tokenRequestId) public view
returns (
		address requesterAddress,
		address depositToken,
		uint256 depositAmount,
		uint256 requestAmount
)
{
		TokenRequest storage tokenRequest = tokenRequests[_tokenRequestId];

		requesterAddress = tokenRequest.requesterAddress;
		depositToken = tokenRequest.depositToken;
		depositAmount = tokenRequest.depositAmount;
		requestAmount = tokenRequest.requestAmount;
}

/**
* @dev convenience function for getting the token request token in a radspec string
*/
function getToken() internal returns (address) {
		return tokenManager.token();
}
```

<br />

## Libraries

TokenRequest.sol depends on two external libraries that have been developed by 1Hive for the purpose of this app.

### AddressArrayLib

`AddressArrayLib` allows us to extend an array of addresses with functionality to easily delete and look up items.

```
pragma solidity ^0.4.24;


library AddressArrayLib {
    function deleteItem(address[] storage self, address item) internal returns (bool) {
        uint256 length = self.length;
        for (uint256 i = 0; i < length; i++) {
            if (self[i] == item) {
                uint256 newLength = self.length - 1;
                if (i != newLength) {
                    self[i] = self[newLength];
                }

                delete self[newLength];
                self.length = newLength;

                return true;
            }
        }
        return false;
    }

    function contains(address[] storage self, address item) internal returns (bool) {
        for (uint256 i = 0; i < self.length; i++) {
            if (self[i] == item) {
                return true;
            }
        }
        return false;
    }
}
```

### UintArrayLib

`UintArrayLib` allows us to extend an array of uint256 with functionality to easily delete items.

```
pragma solidity ^0.4.24;


library UintArrayLib {

   function deleteItem(uint256[] storage self, uint256 item) internal returns (bool) {
        uint256 length = self.length;
        for (uint256 i = 0; i < length; i++) {
            if (self[i] == item) {
                uint256 newLength = self.length - 1;
                if (i != newLength) {
                    self[i] = self[newLength];
                }

                delete self[newLength];
                self.length = newLength;

                return true;
            }
        }
       return false;
    }
}
```

<br />
