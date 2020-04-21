/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "./BaseAgreement.sol";


contract PermissionAgreement is BaseAgreement {
    // bytes32 public constant SIGN_ROLE = keccak256("SIGN_ROLE");
    bytes32 public constant SIGN_ROLE = 0xfbd6b3ad612c81ecfcef77ba888ef41173779a71e0dbe944f953d7c64fd9dc5d;

    function initialize(
        string _title,
        bytes _content,
        ERC20 _collateralToken,
        uint256 _collateralAmount,
        uint256 _challengeCollateral,
        IArbitrator _arbitrator,
        uint64 _delayPeriod,
        uint64 _settlementPeriod
    )
        external
    {
        _initialize(_title, _content, _collateralToken, _collateralAmount, _challengeCollateral, _arbitrator, _delayPeriod, _settlementPeriod);
    }

    function changeSetting(
        bytes _content,
        uint256 _collateralAmount,
        uint256 _challengeCollateral,
        IArbitrator _arbitrator,
        uint64 _delayPeriod,
        uint64 _settlementPeriod
    )
        external
        auth(CHANGE_AGREEMENT_ROLE)
    {
        _newSetting(_content, _collateralAmount, _challengeCollateral, _arbitrator, _delayPeriod, _settlementPeriod);
    }

    function _canSign(address _signer) internal view returns (bool) {
        return canPerform(_signer, SIGN_ROLE, arr(_signer));
    }
}
