pragma solidity 0.4.24;

import "../Agreement.sol";

import "@aragon/os/contracts/common/Autopetrified.sol";
import "@aragon/os/contracts/common/IsContract.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";


contract Staking is IsContract {
    using SafeMath for uint256;
    using SafeERC20 for ERC20;

    string internal constant ERROR_SENDER_NOT_TOKEN = "STAKING_SENDER_NOT_COL_TOKEN";
    string internal constant ERROR_INVALID_STAKE_AMOUNT = "STAKING_INVALID_STAKE_AMOUNT";
    string internal constant ERROR_INVALID_UNSTAKE_AMOUNT = "STAKING_INVALID_UNSTAKE_AMOUNT";
    string internal constant ERROR_NOT_ENOUGH_AVAILABLE_STAKE = "STAKING_NOT_ENOUGH_AVAILABLE_BAL";
    string internal constant ERROR_TOKEN_DEPOSIT_FAILED = "STAKING_TOKEN_DEPOSIT_FAILED";
    string internal constant ERROR_TOKEN_TRANSFER_FAILED = "STAKING_TOKEN_TRANSFER_FAILED";

    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Locked(address indexed user, uint256 amount);
    event Unlocked(address indexed user, uint256 amount);
    event Slashed(address indexed user, uint256 amount);

    struct Stake {
        uint256 available;              // Amount of staked tokens that are available to be used by the owner
        uint256 locked;                 // Amount of staked tokens that are locked for the owner
    }

    ERC20 public token;
    mapping (address => Stake) private stakes;

    /**
    * @notice Create staking contract for token `_token`
    * @param _token Address of the ERC20 token to be used for staking
    */
    constructor(ERC20 _token) public {
        token = _token;
    }

    /**
    * @notice Stake `@tokenAmount(self.collateralToken(): address, _amount)` tokens for `msg.sender`
    * @param _amount Number of tokens to be staked
    */
    function stake(uint256 _amount) external {
        _stake(msg.sender, msg.sender, _amount);
    }

    /**
    * @notice Stake `@tokenAmount(self.collateralToken(): address, _amount)` tokens from `msg.sender` for `_user`
    * @param _user Address staking the tokens for
    * @param _amount Number of tokens to be staked
    */
    function stakeFor(address _user, uint256 _amount) external {
        _stake(msg.sender, _user, _amount);
    }

    /**
    * @dev Callback of `approveAndCall`, allows staking directly with a transaction to the token contract
    * @param _from Address making the transfer
    * @param _amount Amount of tokens to transfer
    * @param _token Address of the token
    */
    function receiveApproval(address _from, uint256 _amount, address _token, bytes /* _data */) external {
        require(msg.sender == _token && _token == address(token), ERROR_SENDER_NOT_TOKEN);
        _stake(_from, _from, _amount);
    }

    /**
    * @notice Unstake `@tokenAmount(self.collateralToken(): address, _amount)` tokens from `msg.sender`
    * @param _amount Number of tokens to be unstaked
    */
    function unstake(uint256 _amount) external {
        require(_amount > 0, ERROR_INVALID_UNSTAKE_AMOUNT);
        _unstake(msg.sender, _amount);
    }

    /**
    * @notice Lock `@tokenAmount(self.collateralToken(): address, _amount)` tokens for `_user`
    * @param _user Address whose tokens are being locked
    * @param _amount Number of tokens to be locked
    */
    function lock(address _user, uint256 _amount) external {
        _lock(_user, _amount);
    }

    /**
    * @notice Unlock `@tokenAmount(self.collateralToken(): address, _amount)` tokens for `_user`
    * @param _user Address whose tokens are being unlocked
    * @param _amount Number of tokens to be unlocked
    */
    function unlock(address _user, uint256 _amount) external {
        _unlock(_user, _amount);
    }

    /**
    * @notice Unlock `@tokenAmount(self.collateralToken(): address, _unlockAmount)` tokens for `_user`, and
    * @notice slash `@tokenAmount(self.collateralToken(): address, _slashAmount)` for `_user` in favor of `_beneficiary`
    * @param _user Address whose tokens are being unlocked and slashed
    * @param _unlockAmount Number of tokens to be unlocked
    * @param _beneficiary Address receiving the slashed tokens
    * @param _slashAmount Number of tokens to be slashed
    */
    function unlockAndSlash(address _user, uint256 _unlockAmount, address _beneficiary, uint256 _slashAmount) external {
        _unlock(_user, _unlockAmount);
        _slash(_user, _beneficiary, _slashAmount);
    }

    /**
    * @notice Slash `@tokenAmount(self.collateralToken(): address, _amount)` tokens for `_user` in favor of `_beneficiary`
    * @param _user Address being slashed
    * @param _beneficiary Address receiving the slashed tokens
    * @param _amount Number of tokens to be slashed
    */
    function slash(address _user, address _beneficiary, uint256 _amount) external {
        _slash(_user, _beneficiary, _amount);
    }

    /**
    * @dev Tell the information related to a user stake
    * @param _user Address being queried
    * @return available Amount of staked tokens that are available to schedule actions
    * @return locked Amount of staked tokens that are locked due to a scheduled action
    */
    function getBalance(address _user) external view returns (uint256 available, uint256 locked) {
        Stake storage balance = stakes[_user];
        available = balance.available;
        locked = balance.locked;
    }

    /**
    * @dev Stake tokens for a user
    * @param _from Address paying for the staked tokens
    * @param _user Address staking the tokens for
    * @param _amount Number of tokens to be staked
    */
    function _stake(address _from, address _user, uint256 _amount) internal {
        Stake storage balance = stakes[_user];
        require(_amount > 0, ERROR_INVALID_STAKE_AMOUNT);

        balance.available = balance.available.add(_amount);
        _transferFrom(_from, _amount);
        emit Staked(_user, _amount);
    }

    /**
    * @dev Unstake tokens for a user
    * @param _user Address unstaking the tokens from
    * @param _amount Number of tokens to be unstaked
    */
    function _unstake(address _user, uint256 _amount) internal {
        Stake storage balance = stakes[_user];
        uint256 availableBalance = balance.available;
        require(availableBalance >= _amount, ERROR_NOT_ENOUGH_AVAILABLE_STAKE);

        balance.available = availableBalance.sub(_amount);
        _transfer(_user, _amount);
        emit Unstaked(_user, _amount);
    }

    /**
    * @dev Lock a number of available tokens for a user
    * @param _user Address whose tokens are being locked
    * @param _amount Number of tokens to be locked
    */
    function _lock(address _user, uint256 _amount) internal {
        Stake storage balance = stakes[_user];
        uint256 availableBalance = balance.available;
        require(availableBalance >= _amount, ERROR_NOT_ENOUGH_AVAILABLE_STAKE);

        balance.available = availableBalance.sub(_amount);
        balance.locked = balance.locked.add(_amount);
        emit Locked(_user, _amount);
    }

    /**
    * @dev Unlock a number of locked tokens for a user
    * @param _user Address whose tokens are being unlocked
    * @param _amount Number of tokens to be unlocked
    */
    function _unlock(address _user, uint256 _amount) internal {
        Stake storage balance = stakes[_user];
        balance.locked = balance.locked.sub(_amount);
        balance.available = balance.available.add(_amount);
        emit Unlocked(_user, _amount);
    }

    /**
    * @dev Slash a number of locked tokens for a user
    * @param _user Address whose tokens are being slashed
    * @param _beneficiary Address receiving the slashed tokens
    * @param _amount Number of tokens to be slashed
    */
    function _slash(address _user, address _beneficiary, uint256 _amount) internal {
        Stake storage balance = stakes[_user];
        balance.locked = balance.locked.sub(_amount);
        _transfer(_beneficiary, _amount);
        emit Slashed(_user, _amount);
    }

    /**
    * @dev Transfer collateral tokens to an address
    * @param _to Address receiving the tokens being transferred
    * @param _amount Number of collateral tokens to be transferred
    */
    function _transfer(address _to, uint256 _amount) internal {
        if (_amount > 0) {
            require(token.safeTransfer(_to, _amount), ERROR_TOKEN_TRANSFER_FAILED);
        }
    }

    /**
    * @dev Transfer collateral tokens from an address to the Agreement app
    * @param _from Address transferring the tokens from
    * @param _amount Number of collateral tokens to be transferred
    */
    function _transferFrom(address _from, uint256 _amount) internal {
        if (_amount > 0) {
            require(token.safeTransferFrom(_from, address(this), _amount), ERROR_TOKEN_DEPOSIT_FAILED);
        }
    }
}
