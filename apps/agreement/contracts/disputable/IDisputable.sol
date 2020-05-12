/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/common/IForwarder.sol";


contract IDisputable is IForwarder {
    function pause(uint256 _disputableId) external;

    function resume(uint256 _disputableId) external;

    function cancel(uint256 _disputableId) external;

    function void(uint256 _disputableId) external;

    function canChallenge(uint256 _disputableId, address _challenger) external view returns (bool);

    function getCollateralRequirement(uint256 _disputableId, uint256 _collateralId) external view
        returns (
            ERC20 collateralToken,
            uint256 actionCollateral,
            uint256 challengeCollateral,
            uint64 challengeDuration
        );
}
