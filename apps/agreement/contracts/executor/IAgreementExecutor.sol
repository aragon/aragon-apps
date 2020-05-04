/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/lib/token/ERC20.sol";


interface IAgreementExecutor {
    function pause(uint256 _executableId) external;

    function resume(uint256 _executableId) external;

    function cancel(uint256 _executableId) external;

    function void(uint256 _executableId) external;

    function canChallenge(uint256 _executableId, address _challenger) external view returns (bool);

    function getCollateralRequirements() external view
        returns (
            ERC20 collateralToken,
            uint256 actionCollateral,
            uint256 challengeCollateral,
            uint64 challengeDuration
        );
}
