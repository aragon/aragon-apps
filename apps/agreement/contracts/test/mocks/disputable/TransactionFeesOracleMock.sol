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
    function setFee(bytes32 _appId, ERC20 _token, uint256 _amount) external {
        _setFee(_appId, _token, _amount);
    }

    function setFees(bytes32[], ERC20[], uint256[]) external {
    }

    /**
    * @notice Unset fees for app with id `_appId`
    * @param _appId Id of the app
    */
    function unsetFee(bytes32 _appId) external {
       _unsetFee(_appId);
    }

    function unsetFees(bytes32[]) external {
    }

    /**
    * @notice Get fees for any app
    * @return Token for the fees
    * @return Amount of fee tokens
    * @return Beneficiary to send the fees to
    */
    function getFee(bytes32) external view returns (ERC20 feeToken, uint256 feeAmount, address beneficiary) {
        return (token, amount, address(this));
    }

    function _setFee(bytes32, ERC20 _token, uint256 _amount) internal {
        require(address(_token) == ETH || isContract(address(_token)), ERROR_WRONG_TOKEN);

        token = _token;
        amount = _amount;
    }

    function _unsetFee(bytes32) internal {
        delete token;
        delete amount;
    }
}
