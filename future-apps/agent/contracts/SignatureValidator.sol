pragma solidity 0.4.24;

// From github.com/DexyProject/protocol
// + https://github.com/0xProject/0x-monorepo/blob/master/packages/contracts/contracts/protocol/Exchange/MixinSignatureValidator.sol
// This should probably be moved into aOS: https://github.com/aragon/aragonOS/pull/442


library SignatureValidator {
    enum SignatureMode {
        Invalid,
        EIP712,
        EthSign
    }

    /// @dev Validates that a hash was signed by a specified signer.
    /// @param hash Hash which was signed.
    /// @param signer Address of the signer.
    /// @param signature ECDSA signature along with the mode (0 = Invalid, 1 = EIP712, 2 = EthSign) {mode}{r}{s}{v}.
    /// @return Returns whether signature is from a specified user.
    function isValidSignature(bytes32 hash, address signer, bytes signature) internal pure returns (bool) {
        SignatureMode mode = SignatureMode(uint8(signature[0]));

        if (mode == SignatureMode.Invalid) {
            return false;
        }

        if (signature.length != 66) {
            return false;
        }

        uint8 v = uint8(signature[65]);
        bytes32 r;
        bytes32 s;
        assembly {
            r := mload(add(signature, 33))
            s := mload(add(signature, 65))
        }

        // Allow signature version to be 0 or 1
        if (v < 27) {
            v += 27;
        }

        if (v != 27 && v != 28) {
            return false;
        }

        bytes32 signedHash;
        if (mode == SignatureMode.EthSign) {
            signedHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        } else if (mode == SignatureMode.EIP712) {
            signedHash = hash;
        } else {
            assert(false);
        }

        return ecrecover(signedHash, v, r, s) == signer;
    }
}
