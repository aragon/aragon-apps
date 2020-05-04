/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";


contract Staking {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    /* Validation errors */
    string internal constant ERROR_SENDER_NOT_ALLOWED = "STAKING_SENDER_NOT_ALLOWED";
    string internal constant ERROR_INVALID_STAKE_AMOUNT = "STAKING_INVALID_STAKE_AMOUNT";
    string internal constant ERROR_INVALID_UNSTAKE_AMOUNT = "STAKING_INVALID_UNSTAKE_AMOUNT";
    string internal constant ERROR_NOT_ENOUGH_AVAILABLE_STAKE = "STAKING_NOT_ENOUGH_AVAILABLE_BAL";
    string internal constant ERROR_TOKEN_DEPOSIT_FAILED = "STAKING_TOKEN_DEPOSIT_FAILED";
    string internal constant ERROR_TOKEN_TRANSFER_FAILED = "STAKING_TOKEN_TRANSFER_FAILED";

    event BalanceStaked(ERC20 indexed token, address indexed user, uint256 amount);
    event BalanceUnstaked(ERC20 indexed token, address indexed user, uint256 amount);
    event BalanceLocked(ERC20 indexed token, address indexed user, uint256 amount);
    event BalanceUnlocked(ERC20 indexed token, address indexed user, uint256 amount);
    event BalanceSlashed(ERC20 indexed token, address indexed user, uint256 amount);

    struct Stake {
        uint256 available;              // Amount of staked tokens that are available to be locked
        uint256 locked;                 // Amount of staked tokens that are locked
    }

    mapping (address => mapping (address => Stake)) private balances;

    /**
    * @notice Stake `@tokenAmount(_token: address, _amount)` tokens for `msg.sender`
    * @param _token ERC20 to be staked
    * @param _amount Number of tokens to be staked by the sender
    */
    function stake(ERC20 _token, uint256 _amount) external {
        _stakeBalance(_token, msg.sender, msg.sender, _amount);
    }

    /**
    * @notice Stake `@tokenAmount(_token: address, _amount)` tokens from `msg.sender` for `_user`
    * @param _token ERC20 to be staked
    * @param _user Address staking the tokens for
    * @param _amount Number of tokens to be staked for the user
    */
    function stakeFor(ERC20 _token, address _user, uint256 _amount) external {
        _stakeBalance(_token, msg.sender, _user, _amount);
    }

    /**
    * @dev Callback of `approveAndCall`, allows staking directly with a transaction to the token contract
    * @param _token ERC20 to be staked
    * @param _from Address making the transfer
    * @param _amount Amount of tokens to transfer
    * @param _token Address of the token
    */
    function receiveApproval(address _from, uint256 _amount, address _token, bytes /* _data */) external {
        require(msg.sender == _token, ERROR_SENDER_NOT_ALLOWED);
        _stakeBalance(ERC20(_token), _from, _from, _amount);
    }

    /**
    * @notice Unstake `@tokenAmount(_token: address, _amount)` tokens from `msg.sender`
    * @param _token ERC20 to be unstaked
    * @param _amount Number of tokens to be unstaked
    */
    function unstake(ERC20 _token, uint256 _amount) external {
        require(_amount > 0, ERROR_INVALID_UNSTAKE_AMOUNT);
        _unstakeBalance(_token, msg.sender, _amount);
    }

    /**
    * @dev Tell the information related to an address stake
    * @param _token ERC20 token being queried
    * @param _user Address being queried
    * @return available Amount of staked tokens that are available to be locked
    * @return locked Amount of staked tokens that are locked
    */
    function getBalance(ERC20 _token, address _user) external view returns (uint256 available, uint256 locked) {
        Stake storage balance = balances[address(_token)][_user];
        available = balance.available;
        locked = balance.locked;
    }

    // Internal fns

    /**
    * @dev Stake tokens for a user
    * @param _token ERC20 to be staked
    * @param _from Address paying for the staked tokens
    * @param _user Address of the user staking the tokens for
    * @param _amount Number of tokens to be staked
    */
    function _stakeBalance(ERC20 _token, address _from, address _user, uint256 _amount) internal {
        require(_amount > 0, ERROR_INVALID_STAKE_AMOUNT);

        Stake storage balance = balances[address(_token)][_user];
        balance.available = balance.available.add(_amount);
        _transferFrom(_token, _from, _amount);
        emit BalanceStaked(_token, _user, _amount);
    }

    /**
    * @dev Move a number of available tokens to locked for a user
    * @param _token ERC20 to be locked
    * @param _user Address of the user to lock tokens for
    * @param _amount Number of tokens to be locked
    */
    function _lockBalance(ERC20 _token, address _user, uint256 _amount) internal {
        Stake storage balance = balances[address(_token)][_user];
        uint256 availableBalance = balance.available;
        require(availableBalance >= _amount, ERROR_NOT_ENOUGH_AVAILABLE_STAKE);

        balance.available = availableBalance.sub(_amount);
        balance.locked = balance.locked.add(_amount);
        emit BalanceLocked(_token, _user, _amount);
    }

    /**
    * @dev Move a number of locked tokens back to available for a user
    * @param _token ERC20 to be unlocked
    * @param _user Address of the user to unlock tokens for
    * @param _amount Number of tokens to be unlocked
    */
    function _unlockBalance(ERC20 _token, address _user, uint256 _amount) internal {
        Stake storage balance = balances[address(_token)][_user];
        balance.locked = balance.locked.sub(_amount);
        balance.available = balance.available.add(_amount);
        emit BalanceUnlocked(_token, _user, _amount);
    }

    /**
    * @dev Slash a number of staked tokens for a user
    * @param _token ERC20 to be slashed
    * @param _user Address of the user to be slashed
    * @param _beneficiary Address receiving the slashed tokens
    * @param _amount Number of tokens to be slashed
    */
    function _slashBalance(ERC20 _token, address _user, address _beneficiary, uint256 _amount) internal {
        if (_amount == 0) {
            return;
        }

        Stake storage balance = balances[address(_token)][_user];
        balance.locked = balance.locked.sub(_amount);
        _transfer(_token, _beneficiary, _amount);
        emit BalanceSlashed(_token, _user, _amount);
    }

    /**
    * @dev Unstake tokens for a user
    * @param _token ERC20 to be unstaked
    * @param _user Address of the user unstaking the tokens
    * @param _amount Number of tokens to be unstaked
    */
    function _unstakeBalance(ERC20 _token, address _user, uint256 _amount) internal {
        Stake storage balance = balances[address(_token)][_user];
        uint256 availableBalance = balance.available;
        require(availableBalance >= _amount, ERROR_NOT_ENOUGH_AVAILABLE_STAKE);

        balance.available = availableBalance.sub(_amount);
        _transfer(_token, _user, _amount);
        emit BalanceUnstaked(_token, _user, _amount);
    }

    /**
    * @dev Transfer tokens to an address
    * @param _token ERC20 token to be transferred
    * @param _to Address receiving the tokens being transferred
    * @param _amount Number of tokens to be transferred
    */
    function _transfer(ERC20 _token, address _to, uint256 _amount) internal {
        if (_amount > 0) {
            require(_token.safeTransfer(_to, _amount), ERROR_TOKEN_TRANSFER_FAILED);
        }
    }

    /**
    * @dev Transfer tokens from an address to the Staking instance
    * @param _token ERC20 token to be transferred from
    * @param _from Address transferring the tokens from
    * @param _amount Number of tokens to be transferred
    */
    function _transferFrom(ERC20 _token, address _from, uint256 _amount) internal {
        if (_amount > 0) {
            require(_token.safeTransferFrom(_from, address(this), _amount), ERROR_TOKEN_DEPOSIT_FAILED);
        }
    }
}
