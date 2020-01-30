# Agent

Agent is a multi-purpose Aragon app having the ability to perform arbitrary calls to external contracts as well as holding assets such as Ether, ERC-20 and ERC-721 tokens. It can be thought of as the external interface of a DAO and as its Vault. See our [guide](https://hack.aragon.org/docs/guides-use-agent) for concrete examples on how to use the Agent app.

## 1. Functionalities

### 1.1. Arbitrary call execution

The following function can be used to execute arbitrary calls:

- `execute(address _target, uint256 _ethValue, bytes _data)` 
  - Protected by the `EXECUTE_ROLE` permission.

If the sender has the right ACL permissions, it will execute an EVM call to `_target`, sending the specified ETH amount (in Wei) and `_data` as the calldata.

- If the call reverts, it will revert by forwarding the error data from the `_target`, if any.
- If the call succeeds, it will emit the [Execute](#311-execute) event.

Since any data can be passed as argument, it is important to note that `execute()` may open an attack vector into your organization and the assets it controls (e.g. ERC-20 tokens). Consider using `safeExecute()` for all calls that don't require the transfer of funds. See the [Security](#14-security) section for further details.

### 1.2. Signature handling

Agent implements the [ERC-1271](https://github.com/ethereum/EIPs/blob/master/EIPS/eip-1271.md) standard, which means it can provide signature validation without actually having a private key. Two options are available to validate a signature (both options can be used together):

1\. An entity can pre-sign a specific hash, which will basically add the hash to a whitelist:

  - `presignHash(bytes32 _hash)`
    - Protected by the `ADD_PRESIGNED_HASH_ROLE` permission.

2\. The Vault can set an external account that will act as its signer: 

  - `setDesignatedSigner(address _designatedSigner)`
    - Protected by the `DESIGNATE_SIGNER_ROLE` permission.

When `isValidSignature()` is called, it will first check if the hash is pre-signed, otherwise it will validate the signature with the designated signer's address. 

The designated signer can also be a contract implementing the ERC-1271 standard, in which case `isValidSignature()` will be called on the contract.

In all, 3 different signature modes are supported, encoded in the first byte of the signature:
  - `1`: EIP-712
  - `2`: EthSign
  - `3`: ERC-1271


### 1.3. Vault

The Agent app is a superset of the [Vault](../vault/README.md) contract, which means that it can store or transfer the tokens and Ether of the DAO in which it is installed. Specifically, the following functions are available: 

 - `deposit(address _token, uint256 _value)` 
 - `transfer(address _token, address _to, uint256 _value)` 
   - Protected by the `TRANSFER_ROLE` permission.
 - `balance(address _token)`

More importantly, this property means that Agent is capable of using the DAO's funds to interact seemlessly with any contracts that require the sender to possess Ether or ERC-20 tokens (e.g. Exchanging tokens on [Uniswap](https://uniswap.io), participating in a [PoolTogether](https://www.pooltogether.com) lottery).

### 1.4. Security

Since the Agent app can manage tokens and Ether, it is crucial to always keep security in mind. In order to restrict unauthorized transfers and other abusive behaviors, a variant of the `execute()` function is available, and protected by a separate role, that will prevent any attempt to transfer tokens included in a "protected tokens" list:

- `safeExecute(address _target, bytes _data)` 
  - Protected by the `SAFE_EXECUTE_ROLE` permission.

The function fetches balances for every protected token before and after executing the function, making sure they are equal. If a balance has changed, it reverts the call.

The following functions can be used to add or remove a token address to the protected tokens list:

- `addProtectedToken(address _token)` 
  - Protected by the `ADD_PROTECTED_TOKEN_ROLE` permission.
- `removeProtectedToken(address _token)` 
  - Protected by the `REMOVE_PROTECTED_TOKEN_ROLE` permission.

### 1.5. Forwarder

Agent implements the [Forwarder](https://hack.aragon.org/docs/forwarding-intro) interface, which allow the possibility to execute EVMScripts and higher flexibility in inter-DAO interactions.

Executing EVMScripts with the Agent app requires the `RUN_SCRIPT_ROLE` permission and can be parametrized with the `keccak256` hash of the script.

Note that granting the `RUN_SCRIPT_ROLE` is virtually like granting `TRANSFER_TOKENS_ROLE` but without the possibility of parametrizing permissions, therefore it should be more restricted.


## 2. Entry points

### 2.1. Initialize
 - **Actor:** External entity, ultimately calling the function through the `Kernel`
 - **Inputs:** None
 - **Pre-flight checks:**
   - Ensure the app has not already been initialized
 - **State transitions:**
   - Initialize the app

### 2.2. Execute
 - **Actor:** External entity
 - **Inputs:** 
   - **Target:** Address where the action is being executed
   - **ETH value:** Amount of ETH (in Wei) sent with the action
   - **Data:** Calldata for the action
 - **Pre-flight checks:**
   - Ensure the actor has the `EXECUTE_ROLE` permission with the following ACL parameters:
     - Target address
     - ETH value
     - Data signature
 - **State transitions:**
   - Decrease the contract's ETH amount by `ETH value` passed as input
   - May increase or decrease the amount of tokens stored in the contract

### 2.3. Safe execute
 - **Actor:** External entity
 - **Inputs:** 
   - **Target:** Address where the action is being executed
   - **Data:** Calldata for the action
 - **Pre-flight checks:**
   - Ensure the actor has the `SAFE_EXECUTE_ROLE` permission with the following ACL parameters:
     - Target address
     - Data signature
 - **State transitions:** None

### 2.4. Add protected token
 - **Actor:** External entity
 - **Inputs:** 
   - **Token:** Address of the protected token
 - **Pre-flight checks:**
   - Ensure the actor has the `ADD_PROTECTED_TOKEN_ROLE` permission with the following ACL parameters:
     - Token address
   - Ensure that the current number of protected tokens is less than the maximum allowed (10)
   - Ensure that the token is not already protected
 - **State transitions:** 
   - Add the token address to the protected tokens list

### 2.5. Remove protected token
 - **Actor:** External entity
 - **Inputs:** 
   - **Token:** Address of the protected token
 - **Pre-flight checks:**
   - Ensure the actor has the `REMOVE_PROTECTED_TOKEN_ROLE` permission with the following ACL parameters:
     - Token address
   - Ensure that the token is stored in the protected tokens list
 - **State transitions:** 
   - Remove the token address from the protected tokens list

### 2.6. Presign hash
 - **Actor:** External entity
 - **Inputs:** 
   - **Hash:** Hash to presign
 - **Pre-flight checks:**
   - Ensure the actor has the `ADD_PRESIGNED_HASH_ROLE` permission with the following ACL parameters:
     - Hash
 - **State transitions:** 
   - Add the hash to the presigned hash list

### 2.7. Set designated signer
 - **Actor:** External entity
 - **Inputs:** 
   - **Designated signer:** Address of the designated signer
 - **Pre-flight checks:**
   - Ensure the actor has the `DESIGNATE_SIGNER_ROLE` permission with the following ACL parameters:
     - Designated signer
   - Ensure the designated signer is not the contract itself    
 - **State transitions:** 
   - Set the designated signer

### 2.8. Forward
 - **Actor:** External entity
 - **Inputs:** 
   - **EVM script:** Script to be executed
 - **Pre-flight checks:**
   - Ensure the actor has the `RUN_SCRIPT_ROLE` permission with the following ACL parameters:
     - Hash of the EVM script
 - **State transitions:** None

## 3. External interface

### 3.1. Events

The following events are emitted by `Agent`:

#### 3.1.1. Execute 
 - **Name:** `Execute`
 - **Args:** 
   - **Sender:** Address of the original sender
   - **Target:** Address of the target contract
   - **ETH value:** ETH amount sent in Wei
   - **Data:** Transaction data

#### 3.1.2. Safe execute
 - **Name:** `SafeExecute`
 - **Args:** 
   - **Sender:** Address of the sender
   - **Target:** Address of the target contract
   - **Data:** Transaction data

#### 3.1.3. Add protected token 
 - **Name:** `AddProtectedToken`
 - **Args:** 
   - **Token:** Token address

#### 3.1.4. Remove protected token 
 - **Name:** `RemoveProtectedToken`
 - **Args:** 
   - **Token:** Token address

#### 3.1.5. Presign hash 
 - **Name:** `PresignHash`
 - **Args:** 
   - **Sender:** Address of the sender
   - **Hash:** Presigned hash

#### 3.1.6. Set designated signer
 - **Name:** `SetDesignatedSigner`
 - **Args:** 
   - **Sender:** Address of the sender
   - **Old signer:** Address of the previous signer
   - **New signer:** Address of the new signer

### 3.2. Getters

#### 3.2.1. Is presigned
 - **Inputs:** 
   - **Hash:** Hash
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Is presigned**: Whether the hash is presigned or not.

#### 3.2.2. Designated signer
 - **Inputs:** None
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Designated signer**: Address of the designated signer

#### 3.2.3. Protected token
 - **Inputs:** 
   - **Index:** Token index
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Protected tokens**: Address of the protected token

#### 3.2.4. Is forwarder
 - **Inputs:** None
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Is forwarder**: Whether `Agent` is a `Forwarder`. Always `true`.

#### 3.2.5. Can forward
 - **Inputs:** 
   - **Sender:** Address of the account intending to forward an action
   - **EVM script**: Script to forward
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Can forward**: Whether the action can be forwarded or not

#### 3.2.6. Protected tokens length
 - **Inputs:** None
 - **Pre-flight checks:** 
   - Ensure the contract is initialized
 - **Outputs:**
   - **Protected tokens length**: Number of protected tokens

#### 3.2.7. Supports interface
 - **Inputs:** 
   - **Interface ID:** Interface bytes to check
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Supports interface**: Whether the contract supports the interface

#### 3.2.8. Is valid signature
 - **Inputs:** 
   - **Hash:** Data signed on the behalf of address(this)
   - **Signature:** Signature byte array associated with the data
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Is valid signature bytes**: The `ERC-1271` magic value if the signature is valid


## 4. Architecture

### 4.1. Inheritance and implementation

- [Vault](../vault/README.md)
- [Forwarder](https://hack.aragon.org/docs/forwarding-intro)
- [ERC165](https://eips.ethereum.org/EIPS/eip-165)
- [ERC1271Bytes](https://eips.ethereum.org/EIPS/eip-1271)
- [IsContract](https://github.com/aragon/aragonOS/blob/master/contracts/common/IsContract.sol)

### 4.2. Libraries

- [SignatureValidator](./contracts/SignatureValidator.sol)
