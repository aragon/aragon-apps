/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/common/IForwarder.sol";

import "../IAgreement.sol";
import "../standards/ERC165.sol";


contract IDisputable is IForwarder, ERC165 {
    bytes4 internal constant ERC165_INTERFACE_ID = bytes4(0x01ffc9a7);
    bytes4 internal constant DISPUTABLE_INTERFACE_ID = bytes4(0x5fca5d80);

    function setAgreement(IAgreement _agreement) external;

    function onDisputableChallenged(uint256 _disputableId, address _challenger) external;

    function onDisputableAllowed(uint256 _disputableId) external;

    function onDisputableRejected(uint256 _disputableId) external;

    function onDisputableVoided(uint256 _disputableId) external;

    function getAgreement() external view returns (IAgreement);

    /**
    * @dev Query if a contract implements a certain interface
    * @param _interfaceId The interface identifier being queried, as specified in ERC-165
    * @return True if the contract implements the requested interface and if its not 0xffffffff, false otherwise
    */
    function supportsInterface(bytes4 _interfaceId) external pure returns (bool) {
        return _interfaceId == DISPUTABLE_INTERFACE_ID || _interfaceId == ERC165_INTERFACE_ID;
    }
}
