pragma solidity 0.4.24;

import "../../standards/IERC165.sol";
import "../../standards/ERC1271.sol";


contract DesignatedSigner /* is IERC165, ERC1271 */ {
    bool isInterface;
    bool isValid;
    bool isValidRevert;
    bool modifyState;

    constructor (bool _isInterface, bool _isValid, bool _isValidRevert, bool _modifyState) public {
        isInterface = _isInterface;
        isValid = _isValid;
        isValidRevert = _isValidRevert;
        modifyState = _modifyState;
    }

    // Can't be ERC165-compliant since this potentially modifies state
    function supportsInterface(bytes4 interfaceId) external view returns (bool) {
        return isInterface;
    }

    // Can't be ERC1271-compliant since this potentially modifies state
    function isValidSignature(bytes32, bytes) external returns (bool) {
        require(!isValidRevert);

        if (modifyState) {
            modifyState = false;
        }

        return isValid;
    }
}
