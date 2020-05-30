pragma solidity 0.4.24;

/**
* Borrowed from https://github.com/Arachnid/solidity-stringutils/
*/
library BytesHelper {
    function pipe(bytes memory self, address other) internal pure returns (bytes memory) {
        return pipe(self, abi.encodePacked(other));
    }

    function pipe(bytes memory self, uint256 other) internal pure returns (bytes memory) {
        bytes memory castedOther = new bytes(32);
        assembly { mstore(add(castedOther, 32), other) }
        return pipe(self, castedOther);
    }

    function pipe(bytes memory self, bytes memory other) internal pure returns (bytes memory) {
        bytes memory pipe = new bytes(1);
        pipe[0] = 0x7C;

        bytes memory result = new bytes(self.length + other.length + 1);

        uint256 selfPtr;
        assembly { selfPtr := add(self, 32) }

        uint256 pipePtr;
        assembly { pipePtr := add(pipe, 32) }

        uint256 otherPtr;
        assembly { otherPtr := add(other, 32) }

        uint256 resultPtr;
        assembly { resultPtr := add(result, 32) }

        memcpy(resultPtr, selfPtr, self.length);
        memcpy(resultPtr + self.length, pipePtr, pipe.length);
        memcpy(resultPtr + self.length + pipe.length, otherPtr, other.length);
        return result;
    }

    function memcpy(uint256 dest, uint256 src, uint256 len) private pure {
        // Copy word-length chunks while possible
        for(; len >= 32; len -= 32) {
            assembly { mstore(dest, mload(src)) }
            dest += 32;
            src += 32;
        }

        // Copy remaining bytes
        uint256 mask = 256 ** (32 - len) - 1;
        assembly {
            let srcpart := and(mload(src), not(mask))
            let destpart := and(mload(dest), mask)
            mstore(dest, or(destpart, srcpart))
        }
    }
}
