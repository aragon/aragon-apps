pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/common/IsContract.sol";
import "@aragon/os/contracts/lib/arbitration/IAragonAppFeesCashier.sol";


contract AragonAppFeesCashierMock is IAragonAppFeesCashier, EtherTokenConstant, IsContract {
    string private constant ERROR_WRONG_TOKEN = "AAFC_WRONG_TOKEN";
    string private constant ERROR_NON_ZERO_VALUE = "AAFC_NON_ZERO_VALUE";

    ERC20 internal token;
    uint256 internal amount;

    /**
    * @notice Set fees for app with id `_appId` to `_amount` of `_token` tokens
    * @param _appId Id of the app
    * @param _token Token for the fee
    * @param _amount Amount of fee tokens
    */
    function setAppFee(bytes32 _appId, ERC20 _token, uint256 _amount) external {
        _setAppFee(_appId, _token, _amount);
    }

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

    function unsetAppFees(bytes32[] _appIds) external {
        for (uint256 i = 0; i < _appIds.length; i++) {
            _unsetAppFee(_appIds[i]);
        }
    }

    function payAppFees(bytes32, bytes) external payable {
        require(msg.value == 0, ERROR_NON_ZERO_VALUE);
        token.transferFrom(msg.sender, address(this), amount);
    }

    /**
    * @notice Get fees for any app
    * @return Token for the fees
    * @return Amount of fee tokens
    */
    function getAppFee(bytes32) external view returns (ERC20 feeToken, uint256 feeAmount) {
        return (token, amount);
    }

    function _setAppFee(bytes32, ERC20 _token, uint256 _amount) internal {
        require(address(_token) == ETH || isContract(address(_token)), ERROR_WRONG_TOKEN);

        token = _token;
        amount = _amount;
    }

    function _unsetAppFee(bytes32) internal {
        delete token;
        delete amount;
    }
}
