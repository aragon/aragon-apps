pragma solidity ^0.4.24;

import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/common/IsContract.sol";
import "@aragon/os/contracts/lib/arbitration/ITransactionFeesOracle.sol";


contract TransactionFeesOracleMock is ITransactionFeesOracle, EtherTokenConstant, IsContract {
    string private constant ERROR_WRONG_TOKEN = "SFO_WRONG_TOKEN";

    ERC20 internal token;
    uint256 internal amount;

    /**
    * @notice Set fees for app with id `_appId` to `_amount` of `_token` tokens
    * @param _appId Id of the app
    * @param _token Token for the fee
    * @param _amount Amount of fee tokens
    */
    function setTransactionFee(bytes32 _appId, ERC20 _token, uint256 _amount) external {
        _setTransactionFee(_appId, _token, _amount);
    }

    function setTransactionFees(bytes32[], ERC20[], uint256[]) external {
    }

    /**
    * @notice Unset fees for app with id `_appId`
    * @param _appId Id of the app
    */
    function unsetTransactionFee(bytes32 _appId) external {
       _unsetTransactionFee(_appId);
    }

    function unsetTransactionFees(bytes32[]) external {}

    function payTransactionFees(bytes32, uint256) external {
        token.transferFrom(msg.sender, address(this), amount);
    }

    /**
    * @notice Get fees for any app
    * @return Token for the fees
    * @return Amount of fee tokens
    */
    function getTransactionFee(bytes32) external view returns (ERC20 feeToken, uint256 feeAmount) {
        return (token, amount);
    }

    function _setTransactionFee(bytes32, ERC20 _token, uint256 _amount) internal {
        require(address(_token) == ETH || isContract(address(_token)), ERROR_WRONG_TOKEN);

        token = _token;
        amount = _amount;
    }

    function _unsetTransactionFee(bytes32) internal {
        delete token;
        delete amount;
    }
}
