/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/acl/IACLOracle.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";

import "./disputable/IDisputable.sol";
import "./arbitration/IArbitrable.sol";


contract IAgreement is IArbitrable, IACLOracle {
    function sign() external;

    function newAction(uint256 _disputableId, address _submitter, bytes _context) external returns (uint256);

    function closeAction(uint256 _actionId) external;

    function challengeAction(uint256 _actionId, uint256 _settlementOffer, bytes _context) external;

    function settle(uint256 _actionId) external;

    function disputeAction(uint256 _actionId) external;

    function executeRuling(uint256 _actionId) external;

    function register(
        IDisputable _disputable,
        ERC20 _collateralToken,
        uint256 _actionAmount,
        uint256 _challengeAmount,
        uint64 _challengeDuration
    ) external;

    function unregister(IDisputable _disputable) external;

    function canProceed(uint256 _actionId) external view returns (bool);
}
