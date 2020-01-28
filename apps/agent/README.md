# Agent



## 1. Functionalities


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
   - Ensure that the current number of protected tokens is inferior than the maximum allowed (hardcoded as a constant)
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

### 4.1 Inheritance and implementation

#### 4.1.1 Vault

#### 4.1.2 Forwarder

#### 4.1.3 ERC165

#### 4.1.4 ERC1271Bytes

#### 4.1.5 IsContract

### 4.2 Libraries

SignatureValidator
