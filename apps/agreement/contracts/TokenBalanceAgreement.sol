/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "./BaseAgreement.sol";


contract TokenBalanceAgreement is BaseAgreement {
    string internal constant ERROR_PERMISSION_TOKEN_NOT_CONTRACT = "AGR_PERM_TOKEN_NOT_CONTRACT";

    event PermissionChanged(ERC20 token, uint256 balance);

    struct TokenBalancePermission {
        ERC20 token;
        uint256 balance;
    }

    TokenBalancePermission private tokenBalancePermission;

    function initialize(
        string _title,
        bytes _content,
        ERC20 _collateralToken,
        uint256 _collateralAmount,
        uint256 _challengeCollateral,
        IArbitrator _arbitrator,
        uint64 _delayPeriod,
        uint64 _settlementPeriod,
        ERC20 _permissionToken,
        uint256 _permissionBalance
    )
        external
    {
        _initialize(_title, _content, _collateralToken, _collateralAmount, _challengeCollateral, _arbitrator, _delayPeriod, _settlementPeriod);
        _newBalancePermission(_permissionToken, _permissionBalance);
    }

    function changeSetting(
        bytes _content,
        uint256 _collateralAmount,
        uint256 _challengeCollateral,
        IArbitrator _arbitrator,
        uint64 _delayPeriod,
        uint64 _settlementPeriod,
        ERC20 _permissionToken,
        uint256 _permissionBalance
    )
        external
        auth(CHANGE_AGREEMENT_ROLE)
    {
        _newSetting(_content, _collateralAmount, _challengeCollateral, _arbitrator, _delayPeriod, _settlementPeriod);
        _newBalancePermission(_permissionToken, _permissionBalance);
    }

    function getTokenBalancePermission() external view returns (ERC20, uint256) {
        TokenBalancePermission storage permission = tokenBalancePermission;
        return (permission.token, permission.balance);
    }

    function _newBalancePermission(ERC20 _permissionToken, uint256 _permissionBalance) internal {
        require(isContract(address(_permissionToken)), ERROR_PERMISSION_TOKEN_NOT_CONTRACT);

        tokenBalancePermission.token = _permissionToken;
        tokenBalancePermission.balance = _permissionBalance;
        emit PermissionChanged(_permissionToken, _permissionBalance);
    }

    function _canSign(address _signer) internal view returns (bool) {
        TokenBalancePermission storage permission = tokenBalancePermission;
        return permission.token.balanceOf(_signer) >= permission.balance;
    }
}
