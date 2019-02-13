pragma solidity 0.4.24;

// Inspired in https://github.com/horizon-games/multi-token-standard/blob/master/contracts/utils/SignatureValidator.sol
// This should probably be moved into aOS: https://github.com/aragon/aragonOS/pull/442

import "./standards/ERC1271.sol";


library SignatureValidator {
    enum SignatureMode {
        Invalid, // 0x00
        EIP712,  // 0x01
        EthSign, // 0x02
        ERC1271, // 0x03
        NMode    // 0x04, to check if mode is specified, leave at the end
    }

    // bytes4(keccak256("isValidSignature(bytes,bytes)")
    bytes4 constant public ERC1271_RETURN_VALID_SIGNATURE = 0x20c13b0b;
    uint256 internal constant ERC1271_ISVALIDSIG_MAX_GAS = 250000;

    /// @dev Validates that a hash was signed by a specified signer.
    /// @param hash Hash which was signed.
    /// @param signer Address of the signer.
    /// @param signature ECDSA signature along with the mode (0 = Invalid, 1 = EIP712, 2 = EthSign, 3 = ERC1271) {mode}{r}{s}{v}.
    /// @return Returns whether signature is from a specified user.
    function isValidSignature(bytes32 hash, address signer, bytes signature) internal view returns (bool) {
        if (signature.length == 0) {
            return false;
        }

        uint8 modeByte = uint8(signature[0]);
        if (modeByte >= uint8(SignatureMode.NMode)) {
            return false;
        }
        SignatureMode mode = SignatureMode(modeByte);

        if (mode == SignatureMode.EIP712) {
            return ecVerify(hash, signer, signature);
        } else if (mode == SignatureMode.EthSign) {
            return ecVerify(
                keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)),
                signer,
                signature
            );
        } else if (mode == SignatureMode.ERC1271) {
            // Pop the mode byte before sending it down the validation chain
            (bytes memory newSig,) = popFirstByte(signature); // `signature` IS CORRUPTED AFTER EXECUTING THIS
            return safeIsValidSignature(signer, hash, newSig);
        } else {
            return false;
        }
    }

    function ecVerify(bytes32 hash, address signer, bytes memory signature) internal pure returns (bool) {
        (bool badSig, bytes32 r, bytes32 s, uint8 v) = unpackEcSig(signature);

        if (badSig) {
            return false;
        }

        return signer == ecrecover(hash, v, r, s);
    }

    function unpackEcSig(bytes memory signature) internal pure returns (bool badSig, bytes32 r, bytes32 s, uint8 v) {
        if (signature.length != 66) {
            badSig = true;
            return;
        }

        v = uint8(signature[65]);
        assembly {
            r := mload(add(signature, 33))
            s := mload(add(signature, 65))
        }

        // Allow signature version to be 0 or 1
        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            badSig = true;
        }
    }

    /**
     * @dev DANGEROUS FUNCTION: Modifies input in place, making it invalid after using this function
     * Memory layout: bytes in parenthesis are returned
     * L = l - 1
     * Input:  ([l1][l2]....[l32][b1][b2]....[bn])
     * Output: [00]([L1][L2]....[L32][b2]....[bn])
     */
    function popFirstByte(bytes memory input) internal pure returns (bytes memory output, byte firstByte) {
        assembly {
            let length := mload(input)
            firstByte := mload(add(input, 0x20))
            output := add(input, 0x01)
            mstore8(input, 0x00) // Probably safe to remove, as it will most already likely be 0
            mstore(output, sub(length, 0x01))
        }
    }

    function safeIsValidSignature(address validator, bytes32 hash, bytes memory signature) internal view returns (bool) {
        bytes memory data = abi.encodeWithSelector(ERC1271(validator).isValidSignature.selector, hash, signature);
        bytes4 erc1271Return = safeBytes4StaticCall(validator, data, ERC1271_ISVALIDSIG_MAX_GAS);
        return erc1271Return == ERC1271_RETURN_VALID_SIGNATURE;
    }

    function safeBytes4StaticCall(address target, bytes data, uint256 maxGas) internal view returns (bytes4 ret) {
        uint256 gasLeft = gasleft();

        uint256 callGas = gasLeft > maxGas ? maxGas : gasLeft;
        bool ok;
        assembly {
            ok := staticcall(callGas, target, add(data, 0x20), mload(data), 0, 0)
        }

        if (!ok) {
            return;
        }

        uint256 size;
        assembly { size := returndatasize }
        if (size != 32) {
            return;
        }

        assembly {
            let ptr := mload(0x40)       // get next free memory ptr
            returndatacopy(ptr, 0, size) // copy return from above `staticcall`
            ret := mload(ptr)            // read data at ptr and set it to be returned
        }

        return ret;
    }
}
