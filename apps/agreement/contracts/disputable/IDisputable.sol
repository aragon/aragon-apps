/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/common/IForwarder.sol";

import "../IAgreement.sol";


contract IDisputable is IForwarder {
    function setAgreement(IAgreement _agreement) external;

    function onDisputableChallenged(uint256 _disputableId, address _challenger) external;

    function onDisputableAllowed(uint256 _disputableId) external;

    function onDisputableRejected(uint256 _disputableId) external;

    function onDisputableVoided(uint256 _disputableId) external;

    function getAgreement() external view returns (IAgreement);
}
