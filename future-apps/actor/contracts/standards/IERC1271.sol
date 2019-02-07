pragma solidity 0.4.24;


interface IERC1271 {
    // TODO: Standard is not finalized, discussion: https://github.com/ethereum/EIPs/issues/1271
    // Can't be marked external due to function overload clash with memory and calldata, see:
    // https://github.com/ethereum/solidity/issues/4832
    function isValidSignature(bytes32 hash, bytes signature) public view returns (bool);
}
