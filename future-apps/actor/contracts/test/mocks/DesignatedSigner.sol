pragma solidity 0.4.24;

import "../../standards/IERC165.sol";
import "../../standards/IERC1271.sol";


contract DesignatedSigner is /*IERC165,*/ IERC1271 {
	bool isInterface;
	bool isValid;
	bool isValidRevert;
	bool modifyState;

	constructor (bool _isInterface, bool _isValid, bool _isValidRevert, bool _modifyState) {
		isInterface = _isInterface;
		isValid = _isValid;
		isValidRevert = _isValidRevert;
		modifyState = _modifyState;
	}

	function supportsInterface(bytes4 interfaceId) external view returns (bool) {
		return isInterface;
	}

	function isValidSignature(bytes32 hash, bytes signature) public view returns (bool) {
		require(!isValidRevert);

		if (modifyState) {
			modifyState = false;
		}

		return isValid;
	}
}