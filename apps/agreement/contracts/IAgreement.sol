/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/lib/token/ERC20.sol";

import "./arbitration/IArbitrable.sol";


contract IAgreement is IArbitrable {
    function sign() external;

    function newAction(
        uint256 _executableId,
        address _submitter,
        uint256 _collateral,
        ERC20 _collateralToken,
        bytes _context
    )
        external
        returns (uint256);

    function close(uint256 _actionId) external;

    function challengeAction(uint256 _actionId, uint256 _settlementOffer, bytes _context) external;

    function settle(uint256 _actionId) external;

    function disputeAction(uint256 _actionId) external;

    function executeRuling(uint256 _actionId) external;

    function canProceed(uint256 _actionId) external view returns (bool);
}
