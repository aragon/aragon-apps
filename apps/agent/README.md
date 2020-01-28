# Agent



## 1. Mechanism

## 2. Architecture

### 2.1 Inheritance and implementation

#### 2.1.1 Vault

#### 2.1.2 Forwarder

#### 2.1.3 ERC165

#### 2.1.4 ERC1271Bytes

#### 2.1.5 IsContract

### 2.2 Libraries

SignatureValidator

## 3. Entry points

## 4. External interface

### 4.1 Events

The following events are emitted by `Agent`:

#### 4.1.1 Execute 
 - **Name:** `Execute`
 - **Args:** 
   - **Sender:** Address of the original sender
   - **Target:** Address of the target contract
   - **ETH value:** 
   - **Data:** Transaction data

#### 4.1.2 Safe execute
 - **Name:** `SafeExecute`
 - **Args:** 
   - **Sender:** Address of the sender
   - **Target:** Address of the target contract
   - **Data:** Transaction data

#### 4.1.3 Add protected token 
 - **Name:** `AddProtectedToken`
 - **Args:** 
   - **Token:** Token address

#### 4.1.4 Remove protected token 
 - **Name:** `RemoveProtectedToken`
 - **Args:** 
   - **Token:** Token address

#### 4.1.5 Presign hash 
 - **Name:** `PresignHash`
 - **Args:** 
   - **Sender:** Address of the sender
   - **Hash:** Presigned hash

#### 4.1.6 Set designated signer
 - **Name:** `SetDesignatedSigner`
 - **Args:** 
   - **Sender:** Address of the sender
   - **Old signer:** Address of the previous signer
   - **New signer:** Address of the new signer

### 4.2 Getters

#### 4.2.1 Is presigned
 - **Inputs:** 
   - **Hash:** Hash
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Is presigned**: Whether the hash is presigned or not.

#### 4.2.2 Designated signer
 - **Inputs:** None
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Designated signer**: Address of the designated signer

#### 4.2.3 Protected token
 - **Inputs:** 
   - **Index:** Token index
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Protected tokens**: Address of the protected token

#### 4.2.4 Is forwarder
 - **Inputs:** None
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Is forwarder**: Whether `Agent` is a `Forwarder`. Always `true`.

#### 4.2.5 Can forward
 - **Inputs:** 
   - **Sender:** Address of the account intending to forward an action
   - **EVM script**: Script to forward
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Can forward**: Whether the action can be forwarded or not

#### 4.2.6 Protected tokens length
 - **Inputs:** None
 - **Pre-flight checks:** 
   - Ensure the contract is initialized
 - **Outputs:**
   - **Protected tokens length**: Number of protected tokens

#### 4.2.7 Supports interface
 - **Inputs:** 
   - **Interface ID:** Interface bytes to check
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Supports interface**: Whether the contract supports the interface

#### 4.2.8 Is valid signature
 - **Inputs:** 
   - **Hash:** Data signed on the behalf of address(this)
   - **Signature:** Signature byte array associated with the data
 - **Pre-flight checks:** None
 - **Outputs:**
   - **Is valid signature bytes**: The `ERC-1271` magic value if the signature is valid

