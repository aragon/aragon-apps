pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/IForwarder.sol";
import "@aragon/os/contracts/common/IForwarderFee.sol";
import "@aragon/os/contracts/common/SafeERC20.sol";
import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/evmscript/ScriptHelpers.sol";

contract TimeLock is AragonApp, IForwarder, IForwarderFee {

    using SafeERC20 for ERC20;
    using SafeMath for uint256;
    using ScriptHelpers for bytes;

    // bytes32 internal constant EXECUTOR_TYPE = keccak256("CALLS_SCRIPT");
    bytes32 internal constant CALLS_SCRIPT_EXECUTOR_TYPE = 0x2dc858a00f3e417be1394b87c07158e989ec681ce8cc68a9093680ac1a870302;

    bytes32 public constant CHANGE_DURATION_ROLE = keccak256("CHANGE_DURATION_ROLE");
    bytes32 public constant CHANGE_AMOUNT_ROLE = keccak256("CHANGE_AMOUNT_ROLE");
    bytes32 public constant CHANGE_SPAM_PENALTY_ROLE = keccak256("CHANGE_SPAM_PENALTY_ROLE");
    bytes32 public constant LOCK_TOKENS_ROLE = keccak256("LOCK_TOKENS_ROLE");

    string private constant ERROR_NOT_CONTRACT = "TIME_LOCK_NOT_CONTRACT";
    string private constant ERROR_TOO_MANY_WITHDRAW_LOCKS = "TIME_LOCK_TOO_MANY_WITHDRAW_LOCKS";
    string private constant ERROR_CAN_NOT_FORWARD = "TIME_LOCK_CAN_NOT_FORWARD";
    string private constant ERROR_TRANSFER_REVERTED = "TIME_LOCK_TRANSFER_REVERTED";
    string private constant ERROR_USE_CALLS_SCRIPT_EXECUTOR = "TIME_LOCK_USE_CALLS_SCRIPT_EXECUTOR";
    string private constant ERROR_SCRIPT_INCORRECT_LENGTH = "TIME_LOCK_SCRIPT_INCORRECT_LENGTH";

    struct WithdrawLock {
        uint256 unlockTime;
        uint256 lockAmount;
    }

    ERC20 public token;
    uint256 public lockDuration;
    uint256 public lockAmount;

    uint256 public spamPenaltyFactor;
    uint256 public constant PCT_BASE = 10 ** 18; // 0% = 0; 1% = 10^16; 100% = 10^18

    // Using an array of WithdrawLocks instead of a mapping here means we cannot add fields to the WithdrawLock
    // struct in an upgrade of this contract. If we want to be able to add to the WithdrawLock structure in
    // future we must use a mapping instead, requiring overhead of storing index.
    mapping(address => WithdrawLock[]) public addressesWithdrawLocks;
    address[] scriptRunnerBlacklist;

    event ChangeLockDuration(uint256 newLockDuration);
    event ChangeLockAmount(uint256 newLockAmount);
    event ChangeSpamPenaltyFactor(uint256 newSpamPenaltyFactor);
    event NewLock(address lockAddress, uint256 unlockTime, uint256 lockAmount);
    event Withdrawal(address withdrawalAddress ,uint256 withdrawalLockCount);

    /**
    * @notice Initialize the Time Lock app
    * @param _token The token which will be locked when forwarding actions
    * @param _lockDuration The duration tokens will be locked before being able to be withdrawn
    * @param _lockAmount The amount of the token that is locked for each forwarded action
    * @param _spamPenaltyFactor The spam penalty factor (`_spamPenaltyFactor / PCT_BASE`)
    */
    function initialize(address _token, uint256 _lockDuration, uint256 _lockAmount, uint256 _spamPenaltyFactor) external onlyInit {
        require(isContract(_token), ERROR_NOT_CONTRACT);

        token = ERC20(_token);
        lockDuration = _lockDuration;
        lockAmount = _lockAmount;
        spamPenaltyFactor = _spamPenaltyFactor;

        scriptRunnerBlacklist.push(address(this));
        scriptRunnerBlacklist.push(address(token));

        initialized();
    }

    /**
    * @notice Change lock duration to `@transformTime(_lockDuration)`
    * @param _lockDuration The new lock duration
    */
    function changeLockDuration(uint256 _lockDuration) external auth(CHANGE_DURATION_ROLE) {
        lockDuration = _lockDuration;
        emit ChangeLockDuration(lockDuration);
    }

    /**
    * @notice Change lock amount to `@tokenAmount(self.token(): address, _lockAmount, true)`
    * @param _lockAmount The new lock amount
    */
    function changeLockAmount(uint256 _lockAmount) external auth(CHANGE_AMOUNT_ROLE) {
        lockAmount = _lockAmount;
        emit ChangeLockAmount(lockAmount);
    }

    /**
    * @notice Change spam penalty factor to `@formatPct(_spamPenaltyFactor)`
    * @param _spamPenaltyFactor The new spam penalty factor
    */
    function changeSpamPenaltyFactor(uint256 _spamPenaltyFactor) external auth(CHANGE_SPAM_PENALTY_ROLE) {
        spamPenaltyFactor = _spamPenaltyFactor;
        emit ChangeSpamPenaltyFactor(_spamPenaltyFactor);
    }

    /**
    * @notice Withdraw all withdrawable tokens
    */
    function withdrawAllTokens() external {
        WithdrawLock[] storage addressWithdrawLocks = addressesWithdrawLocks[msg.sender];
        _withdrawTokens(addressWithdrawLocks.length);
    }

    /**
    * @notice Withdraw all withdrawable tokens from the `_numberWithdrawLocks` oldest withdraw lock's
    * @param _numberWithdrawLocks The number of withdraw locks to attempt withdrawal from
    */
    function withdrawTokens(uint256 _numberWithdrawLocks) external {
        _withdrawTokens(_numberWithdrawLocks);
    }

    /**
    * @notice Returns the forward fee token and required lock amount
    * @dev IFeeForwarder interface conformance
    *      Note that the Time Lock app has to be the first forwarder in the transaction path, it must be called by an
    *      EOA not another forwarder, in order for the spam penalty mechanism to work
    * @return Forwarder token address
    * @return Forwarder lock amount
    */
    function forwardFee() external view returns (address, uint256) {
        (uint256 _spamPenaltyAmount, ) = getSpamPenalty(msg.sender);

        uint256 totalLockAmountRequired = lockAmount.add(_spamPenaltyAmount);

        return (address(token), totalLockAmountRequired);
    }

    /**
    * @notice Returns whether the Time Lock app is a forwarder or not
    * @dev IForwarder interface conformance
    * @return Always true
    */
    function isForwarder() external pure returns (bool) {
        return true;
    }

    /**
    * @notice Returns whether the `_sender` can forward actions or not
    * @dev IForwarder interface conformance
    * @return True if _sender has LOCK_TOKENS_ROLE role
    */
    function canForward(address _sender, bytes) public view returns (bool) {
        return canPerform(_sender, LOCK_TOKENS_ROLE, arr(_sender));
    }

    /**
    * @notice Locks `@tokenAmount(self.token(): address, self.getSpamPenalty(msg.sender): uint + self.lockAmount(): uint)` tokens for `@transformTime(self.getSpamPenalty(msg.sender): (uint, <uint>) + self.lockDuration(): uint)` and executes desired action
    * @dev IForwarder interface conformance.
    *      Note that the Time Lock app has to be the first forwarder in the transaction path, it must be called by an
    *      EOA not another forwarder, in order for the spam penalty mechanism to work
    * @param _evmCallScript Script to execute
    */
    function forward(bytes _evmCallScript) public {
        require(canForward(msg.sender, _evmCallScript), ERROR_CAN_NOT_FORWARD);
        _ensureOnlyOneScript(_evmCallScript);

        WithdrawLock[] storage addressWithdrawLocks = addressesWithdrawLocks[msg.sender];
        (uint256 spamPenaltyAmount, uint256 spamPenaltyDuration) = getSpamPenalty(msg.sender);

        uint256 totalAmount = lockAmount.add(spamPenaltyAmount);
        uint256 totalDuration = lockDuration.add(spamPenaltyDuration);
        uint256 unlockTime = getTimestamp().add(totalDuration);

        addressWithdrawLocks.push(WithdrawLock(unlockTime, totalAmount));
        require(token.safeTransferFrom(msg.sender, address(this), totalAmount), ERROR_TRANSFER_REVERTED);

        emit NewLock(msg.sender, unlockTime, totalAmount);
        runScript(_evmCallScript, new bytes(0), scriptRunnerBlacklist);
    }

    function getWithdrawLocksCount(address _lockAddress) public view returns (uint256) {
        return addressesWithdrawLocks[_lockAddress].length;
    }

    /**
    * @notice Get the amount and duration penalty based on the number of current locks `_sender` has
    * @dev Potential out of gas issue is considered acceptable. In this case a user would just have to wait and withdraw()
    *      some tokens before this function and forward() could be called again.
    * @return amount penalty
    * @return duration penalty
    */
    function getSpamPenalty(address _sender) public view returns (uint256, uint256) {
        WithdrawLock[] memory addressWithdrawLocks = addressesWithdrawLocks[_sender];

        uint256 activeLocks = 0;
        for (uint256 withdrawLockIndex = 0; withdrawLockIndex < addressWithdrawLocks.length; withdrawLockIndex++) {
            if (getTimestamp() < addressWithdrawLocks[withdrawLockIndex].unlockTime) {
                activeLocks += 1;
            }
        }

        uint256 totalAmount = lockAmount.mul(activeLocks).mul(spamPenaltyFactor).div(PCT_BASE);
        uint256 totalDuration = lockDuration.mul(activeLocks).mul(spamPenaltyFactor).div(PCT_BASE);

        return (totalAmount, totalDuration);
    }

    function _withdrawTokens(uint256 _numberWithdrawLocks) internal {
        WithdrawLock[] storage addressWithdrawLocks = addressesWithdrawLocks[msg.sender];
        require(_numberWithdrawLocks <= addressWithdrawLocks.length, ERROR_TOO_MANY_WITHDRAW_LOCKS);

        uint256 amountOwed = 0;
        uint256 withdrawLockCount = 0;
        uint256 addressWithdrawLocksLength = addressWithdrawLocks.length;

        for (uint256 i = _numberWithdrawLocks; i > 0; i--) {

            uint256 withdrawLockIndex = i - 1;
            WithdrawLock memory withdrawLock = addressWithdrawLocks[withdrawLockIndex];

            if (getTimestamp() > withdrawLock.unlockTime) {
                amountOwed = amountOwed.add(withdrawLock.lockAmount);
                withdrawLockCount += 1;
                delete addressWithdrawLocks[withdrawLockIndex];
            }
        }

        uint256 newAddressWithdrawLocksLength = addressWithdrawLocksLength - withdrawLockCount;
        for (uint256 shiftIndex = 0; shiftIndex < newAddressWithdrawLocksLength; shiftIndex++) {
            addressWithdrawLocks[shiftIndex] = addressWithdrawLocks[shiftIndex + withdrawLockCount];
            delete addressWithdrawLocks[shiftIndex + withdrawLockCount];
        }

        addressWithdrawLocks.length = newAddressWithdrawLocksLength;

        token.transfer(msg.sender, amountOwed);

        emit Withdrawal(msg.sender, withdrawLockCount);
    }

    function _ensureOnlyOneScript(bytes _evmScript) internal {
        uint256 specIdLength = 0x4;
        uint256 addressLength = 0x14;
        uint256 dataSizeLength = 0x4;
        uint256 dataSizeLocation = 0x18;

        IEVMScriptExecutor scriptExecutor = getEVMScriptExecutor(_evmScript);
        require(scriptExecutor.executorType() == CALLS_SCRIPT_EXECUTOR_TYPE, ERROR_USE_CALLS_SCRIPT_EXECUTOR);

        uint256 calldataLength = uint256(_evmScript.uint32At(dataSizeLocation));
        uint256 scriptExpectedLength = specIdLength + addressLength + dataSizeLength + calldataLength;
        require(scriptExpectedLength == _evmScript.length, ERROR_SCRIPT_INCORRECT_LENGTH);
    }

    /**
    * @dev Disable recovery escape hatch, as it could be used
    *      maliciously to transfer funds away from TimeLock
    */
    function allowRecoverability(address token) public view returns (bool) {
        return false;
    }
}
