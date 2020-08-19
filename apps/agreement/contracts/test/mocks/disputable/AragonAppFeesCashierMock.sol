pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/IsContract.sol";

import "../../../arbitration/IAragonAppFeesCashier.sol";


contract AragonAppFeesCashierMock is IAragonAppFeesCashier, IsContract {
    string private constant ERROR_WRONG_TOKEN = "AAFC_WRONG_TOKEN";
    string private constant ERROR_APP_FEE_NOT_SET = "AAFC_APP_FEE_NOT_SET";
    string private constant ERROR_ETH_APP_FEE_NOT_ALLOWED = "AAFC_ETH_APP_FEE_NOT_ALLOWED";
    string private constant ERROR_FEE_TOKEN_DEPOSIT_FAILED = "AAFC_FEE_TOKEN_DEPOSIT_FAILED";

    struct AppFee {
        bool set;
        ERC20 token;
        uint256 amount;
    }

    mapping (bytes32 => AppFee) internal appFees;

    /**
    * @notice Set fees for app with id `_appId` to `_amount` of `_token` tokens
    * @param _appId Id of the app
    * @param _token Token for the fee
    * @param _amount Amount of fee tokens
    */
    function setAppFee(bytes32 _appId, ERC20 _token, uint256 _amount) external {
        _setAppFee(_appId, _token, _amount);
    }

    /**
    * @notice Set multiple app fees
    * @param _appIds List of IDs of the apps
    * @param _tokens List of tokens for the fees
    * @param _amounts List of amount of the fee tokens
    */
    function setAppFees(bytes32[] _appIds, ERC20[] _tokens, uint256[] _amounts) external {
        for (uint256 i = 0; i < _appIds.length; i++) {
            _setAppFee(_appIds[i], _tokens[i], _amounts[i]);
        }
    }

    /**
    * @notice Unset fees for app with id `_appId`
    * @param _appId Id of the app
    */
    function unsetAppFee(bytes32 _appId) external {
       _unsetAppFee(_appId);
    }

    /**
    * @notice Unset fees for multiple apps
    * @param _appIds List of IDs of the apps
    */
    function unsetAppFees(bytes32[] _appIds) external {
        for (uint256 i = 0; i < _appIds.length; i++) {
            _unsetAppFee(_appIds[i]);
        }
    }

    /**
    * @notice Unset fees for multiple apps
    * @param _appId App id paying for
    */
    function payAppFees(bytes32 _appId, bytes) external payable {
        AppFee storage appFee = appFees[_appId];
        require(appFee.set, ERROR_APP_FEE_NOT_SET);
        require(msg.value == 0, ERROR_ETH_APP_FEE_NOT_ALLOWED);

        ERC20 token = appFee.token;
        require(token.transferFrom(msg.sender, address(this), appFee.amount), ERROR_FEE_TOKEN_DEPOSIT_FAILED);
    }

    /**
    * @notice Get fees for any app
    * @return Token for the fees
    * @return Amount of fee tokens
    */
    function getAppFee(bytes32 _appId) external view returns (ERC20, uint256) {
        AppFee storage appFee = appFees[_appId];
        require(appFee.set, ERROR_APP_FEE_NOT_SET);
        return (appFee.token, appFee.amount);
    }

    /**
    * @dev Internal function to set app fees
    */
    function _setAppFee(bytes32 _appId, ERC20 _token, uint256 _amount) internal {
        require(isContract(address(_token)), ERROR_WRONG_TOKEN);
        AppFee storage appFee = appFees[_appId];
        appFee.set = true;
        appFee.token = _token;
        appFee.amount = _amount;
    }

    /**
    * @dev Internal function to unset app fees
    */
    function _unsetAppFee(bytes32 _appId) internal {
        delete appFees[_appId];
    }
}
