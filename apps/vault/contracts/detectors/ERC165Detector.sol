pragma solidity 0.4.18;

import "./standards/ERC165.sol";


contract ERC165Detector {
    function conformsToERC165(address addr, bytes4 interfaceID) public view returns (bool) {
        return ERC165(addr).supportsInterface(interfaceID);
    }
}
