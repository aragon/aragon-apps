/*
 * SPDX-License-Identitifer: GPL-3.0-or-later
 */

pragma solidity ^0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/math/SafeMath.sol";

import "@aragon/os/contracts/lib/math/SafeMath64.sol";

import "@aragon/apps-vault/contracts/Vault.sol";


contract Allocations is AragonApp {

    using SafeMath for uint256;
    using SafeMath64 for uint64;
    using SafeERC20 for ERC20;

    bytes32 public constant CREATE_ACCOUNT_ROLE = 0x9b9e262b9ea0587fdc5926b22b8ed5837efef4f4cc67bc1a7ee18f68ad83062f;
    bytes32 public constant CREATE_ALLOCATION_ROLE = 0x8af1e3d6225e5adff5174a4949cb3cc04f0f62937083325a9e302eaf5d07cdf1;
    bytes32 public constant EXECUTE_ALLOCATION_ROLE = 0x1ced0be26d1bb2db7a1a0a01064be22894ce4ca0321b6f4b28d0b1a5ce62e7ea;
    bytes32 public constant EXECUTE_PAYOUT_ROLE = 0xa5cf757319c734091fd95cf4b09938ff69ee22637eda897ea92ca59e56f00bcb;
    bytes32 public constant CHANGE_PERIOD_ROLE = 0xd35e458bacdd5343c2f050f574554b2f417a8ea38d6a9a65ce2225dbe8bb9a9d;
    bytes32 public constant CHANGE_BUDGETS_ROLE = 0xd79730e82bfef7d2f9639b9d10bf37ebb662b22ae2211502a00bdf7b2cc3a23a;
    bytes32 public constant SET_MAX_CANDIDATES_ROLE = 0xe593f1908655effa3e2eb1eab075684bd646a51d97f20646bb9ecb2df3e4f2bb;

    uint256 internal constant MAX_UINT256 = uint256(-1);
    uint64 internal constant MAX_UINT64 = uint64(-1);
    uint64 internal constant MINIMUM_PERIOD = uint64(1 days);
    uint256 internal constant MAX_SCHEDULED_PAYOUTS_PER_TX = 20;

    string private constant ERROR_NO_PERIOD = "NO_PERIOD";
    string private constant ERROR_NO_ACCOUNT = "NO_ACCOUNT";
    string private constant ERROR_NO_PAYOUT = "NO_PAYOUT";
    string private constant ERROR_NO_CANDIDATE = "NO_CANDIDATE";
    string private constant ERROR_PERIOD_SHORT = "SET_PERIOD_TOO_SHORT";
    string private constant ERROR_COMPLETE_TRANSITION = "COMPLETE_TRANSITION";
    string private constant ERROR_MIN_RECURRENCE = "RECURRENCES_BELOW_ONE";
    string private constant ERROR_CANDIDATE_NOT_RECEIVER = "CANDIDATE_NOT_RECEIVER";
    string private constant ERROR_INSUFFICIENT_FUNDS = "INSUFFICIENT_FUNDS";

    struct Payout {
        uint64 startTime;
        uint64 recurrences;
        uint64 period;
        address[] candidateAddresses;
        uint256[] supports;
        uint64[] executions;
        uint256 amount;
        string description;
    }

    struct Account {
        uint64 payoutsLength;
        bool hasBudget;
        address token;
        mapping (uint64 => Payout) payouts;
        string metadata;
        uint256 budget;
    }

    struct AccountStatement {
        mapping(address => uint256) expenses;
    }

    struct Period {
        uint64 startTime;
        uint64 endTime;
        mapping (uint256 => AccountStatement) accountStatement;
    }

    uint64 accountsLength;
    uint64 periodsLength;
    uint64 periodDuration;
    uint256 maxCandidates;
    Vault public vault;
    mapping (uint64 => Account) accounts;
    mapping (uint64 => Period) periods;
    mapping(address => uint) accountProxies; // proxy address -> account Id

    event PayoutExecuted(uint64 accountId, uint64 payoutId, uint candidateId);
    event NewAccount(uint64 accountId);
    event NewPeriod(uint64 indexed periodId, uint64 periodStarts, uint64 periodEnds);
    event FundAccount(uint64 accountId);
    event SetDistribution(uint64 accountId, uint64 payoutId);
    event PaymentFailure(uint64 accountId, uint64 payoutId, uint256 candidateId);
    event SetBudget(uint256 indexed accountId, uint256 amount, string name, bool hasBudget);
    event ChangePeriodDuration(uint64 newDuration);

    modifier periodExists(uint64 _periodId) {
        require(_periodId < periodsLength, ERROR_NO_PERIOD);
        _;
    }

    modifier accountExists(uint64 _accountId) {
        require(_accountId < accountsLength, ERROR_NO_ACCOUNT);
        _;
    }

    modifier payoutExists(uint64 _accountId, uint64 _payoutId) {
        require(_payoutId < accounts[_accountId].payoutsLength, ERROR_NO_PAYOUT);
        _;
    }

    // Modifier used by all methods that impact accounting to make sure accounting period
    // is changed before the operation if needed
    // NOTE: its use **MUST** be accompanied by an initialization check
    modifier transitionsPeriod {
        require(
            _tryTransitionAccountingPeriod(getMaxPeriodTransitions()),
            ERROR_COMPLETE_TRANSITION
        );
        _;
    }

    /**
    * @dev On initialization the contract sets a vault, and initializes the periods
    *      and accounts.
    * @param _vault The Aragon vault to pull payments from.
    * @param _periodDuration Base duration of a "period" used for value calculations.
    */
    function initialize(
        Vault _vault,
        uint64 _periodDuration
    ) external onlyInit
    {
        vault = _vault;
        require(_periodDuration >= MINIMUM_PERIOD, ERROR_PERIOD_SHORT);
        periodDuration = _periodDuration;
        _newPeriod(getTimestamp64());
        accountsLength++;  // position 0 is reserved and unused
        maxCandidates = 50;
        initialized();
    }

///////////////////////
// Getter functions
///////////////////////
    /** @notice Basic getter for accounts.
    *   @param _accountId The budget ID you'd like to get.
    */
    function getAccount(uint64 _accountId) external view accountExists(_accountId) isInitialized
    returns(string metadata, address token, bool hasBudget, uint256 budget)
    {
        Account storage account = accounts[_accountId];
        metadata = account.metadata;
        token = account.token;
        hasBudget = account.hasBudget;
        budget = account.budget;
    }

    /** @notice Basic getter for Allocations.
    *   @param _accountId The ID of the budget.
    *   @param _payoutId The ID of the allocation within the budget you'd like to retrieve.
    */
    function getPayout(uint64 _accountId, uint64 _payoutId) external view payoutExists(_accountId, _payoutId) isInitialized
    returns(uint amount, uint64 recurrences, uint startTime, uint period)
    {
        Payout storage payout = accounts[_accountId].payouts[_payoutId];
        amount = payout.amount;
        recurrences = payout.recurrences;
        startTime = payout.startTime;
        period = payout.period;
    }

    /**
    * @notice get the account's remaining budget for the current period
    * @param _accountId The account ID of the budget remaining to be calculated
    */
    function getRemainingBudget(uint64 _accountId) external view accountExists(_accountId)
    returns(uint256)
    {
        return _getRemainingBudget(_accountId);
    }

    /** @notice Basic getter for Allocation descriptions.
    *   @param _accountId The Id of the budget.
    *   @param _payoutId The Id of the allocation within the budget.
    */
    function getPayoutDescription(uint64 _accountId, uint64 _payoutId)
    external
    view
    payoutExists(_accountId, _payoutId)
    isInitialized
    returns(string description)
    {
        Payout storage payout = accounts[_accountId].payouts[_payoutId];
        description = payout.description;
    }

    /** @notice Basic getter for getting the number of options in an Allocation.
    *   @param _accountId The Id of the budget.
    *   @param _payoutId The Id of the allocation within the budget.
    */
    function getNumberOfCandidates(uint64 _accountId, uint64 _payoutId) external view isInitialized payoutExists(_accountId, _payoutId)
    returns(uint256 numCandidates)
    {
        Payout storage payout = accounts[_accountId].payouts[_payoutId];
        numCandidates = payout.supports.length;
    }

    /** @notice Basic getter for Allocation value for a specific recipient.
    *   @param _accountId The Id of the budget.
    *   @param _payoutId The Id of the allocation within the budget.
    *   @param _idx The Id of the specific recipient you'd like to retrieve information for.
    */
    function getPayoutDistributionValue(uint64 _accountId, uint64 _payoutId, uint256 _idx)
    external
    view
    isInitialized
    payoutExists(_accountId, _payoutId)
    returns(uint256 supports, address candidateAddress, uint64 executions)
    {
        Payout storage payout = accounts[_accountId].payouts[_payoutId];
        require(_idx < payout.supports.length, ERROR_NO_CANDIDATE);
        supports = payout.supports[_idx];
        candidateAddress = payout.candidateAddresses[_idx];
        executions = payout.executions[_idx];
    }

    /**
    * @dev We have to check for initialization as periods are only valid after initializing
    */
    function getCurrentPeriodId() external view isInitialized returns (uint64) {
        return _currentPeriodId();
    }

    /** @notice Basic getter for period information.
    *   @param _periodId The Id of the period you'd like to receive information for.
    */
    function getPeriod(uint64 _periodId)
    external
    view
    isInitialized
    periodExists(_periodId)
    returns (
        bool isCurrent,
        uint64 startTime,
        uint64 endTime
    )
    {
        Period storage period = periods[_periodId];

        isCurrent = _currentPeriodId() == _periodId;

        startTime = period.startTime;
        endTime = period.endTime;
    }

///////////////////////
// Allocation functions
///////////////////////
    /**
    * @dev This is the function that sets up a budget for creating allocations.
    * @notice Create "`_metadata`" budget of `@tokenAmount(_token, _budget)` per period.
    * @param _metadata The budget description
    * @param _token Token used for account payouts.
    * @param _hasBudget Whether the account uses budgeting.
    * @param _budget The budget amount
    */
    function newAccount(
        string _metadata,
        address _token,
        bool _hasBudget,
        uint256 _budget
    ) external auth(CREATE_ACCOUNT_ROLE) returns(uint64 accountId)
    {
        accountId = accountsLength++;
        Account storage account = accounts[accountId];
        account.metadata = _metadata;
        account.hasBudget = _hasBudget;
        account.budget = _budget;
        account.token = _token;
        emit NewAccount(accountId);
    }

    /**
    * @notice Change period duration to `@transformTime(_periodDuration)`, effective for next accounting period
    * @param _periodDuration Duration in seconds for accounting periods
    */
    function setPeriodDuration(uint64 _periodDuration)
        external
        auth(CHANGE_PERIOD_ROLE)
        transitionsPeriod
    {
        require(_periodDuration >= MINIMUM_PERIOD, ERROR_PERIOD_SHORT);
        periodDuration = _periodDuration;
        emit ChangePeriodDuration(_periodDuration);
    }

    /**
    * @notice Set the maximum number of candidates that can be paid out in an allocation to `_maxCandidates`.
    * @param _maxCandidates Maximum number of Candidates
    */
    function setMaxCandidates(uint256 _maxCandidates) external auth(SET_MAX_CANDIDATES_ROLE) {
        maxCandidates = _maxCandidates;
    }

    /**
    * @notice `_amount == 0 ? 'Deactivate ' + _metadata + ' budget (#' + _accountId + ')' : 'Update budget #' + _accountId + ' to ' + @tokenAmount(0x0000000000000000000000000000000000000000, _amount, false) + ', effective immediately and optionally update metadata'`
    * @param _accountId Budget Identifier
    * @param _amount New budget amount
    * @param _metadata descriptor for the account (pass in empty string if unchanged)
    */
    function setBudget(
        uint64 _accountId,
        uint256 _amount,
        string _metadata
    )
        external
        auth(CHANGE_BUDGETS_ROLE)
        transitionsPeriod
        accountExists(_accountId)
    {
        accounts[_accountId].budget = _amount;
        // only access storage if necessary
        if (bytes(_metadata).length > 0) {
            accounts[_accountId].metadata = _metadata;
        }
        if (!accounts[_accountId].hasBudget) {
            accounts[_accountId].hasBudget = true;
        }
        emit SetBudget(_accountId, _amount, _metadata, true);
    }

    /**
    * @notice Remove budget #`_accountId`, effective immediately and optionally update budget name.
    * @param _accountId Id for the budget.
    * @param _metadata descriptor for account (pass in empty string if unchanged)
    */
    function removeBudget(uint64 _accountId, string _metadata)
        external
        auth(CHANGE_BUDGETS_ROLE)
        transitionsPeriod
        accountExists(_accountId)
    {
        accounts[_accountId].budget = 0;
        accounts[_accountId].hasBudget = false;
        // only access storage if necessary
        if (bytes(_metadata).length > 0) {
            accounts[_accountId].metadata = _metadata;
        }
        emit SetBudget(_accountId, 0, _metadata, false);
    }

    /**
    * @notice This transaction will execute the allocation for the senders address for budget #`_accountId`
    * @param _accountId The Id of the budget you'd like to take action against
    * @param _payoutId The Id of the allocation within the budget you'd like to execute
    * @param _candidateId The Candidate whose allocation you'll execute (must be sender)
    */
    function candidateExecutePayout(
        uint64 _accountId,
        uint64 _payoutId,
        uint256 _candidateId
    ) external transitionsPeriod isInitialized accountExists(_accountId) payoutExists(_accountId, _payoutId) // solium-disable-line error-reason
    {
        //Payout storage payout = accounts[_accountId].payouts[_payoutId];
        require(msg.sender == accounts[_accountId].payouts[_payoutId].candidateAddresses[_candidateId], ERROR_CANDIDATE_NOT_RECEIVER);
        _executePayoutAtLeastOnce(_accountId, _payoutId, _candidateId, 0);
    }

    /**
    * @notice This transaction will execute the allocation for candidate `_candidateId` within budget #`_accountId`
    * @param _accountId The Id of the budget you'd like to take action against
    * @param _payoutId The Id of the allocation within the budget you'd like to execute
    * @param _candidateId The Candidate whose allocation you'll execute (must be sender)
    */
    function executePayout(
        uint64 _accountId,
        uint64 _payoutId,
        uint256 _candidateId
    ) external transitionsPeriod auth(EXECUTE_PAYOUT_ROLE) accountExists(_accountId) payoutExists(_accountId, _payoutId)
    {
        _executePayoutAtLeastOnce(_accountId, _payoutId, _candidateId, 0);
    }

    /**
    * @dev This function distributes the allocations to the candidates in accordance with the distribution values
    * @notice Distribute allocation #`_payoutId` from budget #`_accountId`.
    * @param _accountId The Id of the budget you'd like to take action against
    * @param _payoutId The Id of the allocation within the budget you'd like to execute
    */
    function runPayout(uint64 _accountId, uint64 _payoutId)
    external
    auth(EXECUTE_ALLOCATION_ROLE)
    transitionsPeriod
    accountExists(_accountId)
    payoutExists(_accountId, _payoutId)
    returns(bool success)
    {
        success = _runPayout(_accountId, _payoutId);
    }

    /**
    * @dev This function is provided to circumvent situations where the transition period
    *      becomes impossible to execute
    * @param _limit Maximum number of periods to advance in this execution
    */
    function advancePeriod(uint64 _limit) external isInitialized {
        _tryTransitionAccountingPeriod(_limit);
    }

    /**
    * @dev This is the function that the DotVote will call. It doesn’t need
    *      to be called by a DotVote (options get weird if it's not)
    *      but for our use case the “CREATE_ALLOCATION_ROLE” will be given to
    *      the DotVote. This function is public for stack-depth reasons
    * @notice Create an allocation from budget #`_accountId` for "`_description`" `(_recurrences > 1) ? 'that will execute ' + _recurrences + ' times': ''`.
    * @param _candidateAddresses Array of potential addresses receiving a share of the allocation.
    * @param _supports The Array of all support values for the various candidates. These values are set in dot voting.
    * @param _description The distribution description
    * @param _accountId The Id of the budget used for the allocation
    * @param _recurrences Quantity used to indicate whether this is a recurring or one-time payout
    * @param _period Time interval between each recurring allocation
    * @param _amount The quantity of funds to be allocated
    */
    function setDistribution(
        address[] _candidateAddresses,
        uint256[] _supports,
        uint256[] /*unused_infoIndices*/,
        string /*unused_candidateInfo*/,
        string _description,
        uint256[] /*unused_level 1 ID - converted to bytes32*/,
        uint256[] /*unused_level 2 ID - converted to bytes32*/,
        uint64 _accountId,
        uint64 _recurrences,
        uint64 _startTime,
        uint64 _period,
        uint256 _amount
    ) public auth(CREATE_ALLOCATION_ROLE) returns(uint64 payoutId)
    {
        require(maxCandidates >= _candidateAddresses.length); // solium-disable-line error-reason
        Account storage account = accounts[_accountId];
        require(vault.balance(account.token) >= _amount * _recurrences); // solium-disable-line error-reason
        require(_recurrences > 0, ERROR_MIN_RECURRENCE);

        Payout storage payout = account.payouts[account.payoutsLength++];

        payout.amount = _amount;
        payout.recurrences = _recurrences;
        payout.candidateAddresses = _candidateAddresses;
        if (_recurrences > 1) {
            payout.period = _period;
            // minimum granularity is a single day
            require(payout.period >= 1 days, ERROR_PERIOD_SHORT);
        }
        payout.startTime = _startTime; // solium-disable-line security/no-block-members
        payout.supports = _supports;
        payout.description = _description;
        payout.executions.length = _supports.length;
        payoutId = account.payoutsLength - 1;
        emit SetDistribution(_accountId, payoutId);
        if (_startTime <= getTimestamp64()) {
            _runPayout(_accountId, payoutId);
        }
    }

    function _executePayoutAtLeastOnce(
        uint64 _accountId,
        uint64 _payoutId,
        uint256 _candidateId,
        uint256 _paid
    )
        internal accountExists(_accountId) returns (uint256)
    {
        Account storage account = accounts[_accountId];
        Payout storage payout = account.payouts[_payoutId];
        require(_candidateId < payout.supports.length, ERROR_NO_CANDIDATE);

        uint256 paid = _paid;
        uint256 totalSupport = _getTotalSupport(payout);

        uint256 individualPayout = payout.supports[_candidateId].mul(payout.amount).div(totalSupport);
        if (individualPayout == 0) {
            return;
        }
        while (_nextPaymentTime(_accountId, _payoutId, _candidateId) <= getTimestamp64() && paid < MAX_SCHEDULED_PAYOUTS_PER_TX) {
            if (!_canMakePayment(_accountId, individualPayout)) {
                emit PaymentFailure(_accountId, _payoutId, _candidateId);
                break;
            }

            // The while() predicate prevents these two from ever overflowing
            paid += 1;

            // We've already checked the remaining budget with `_canMakePayment()`
            _executeCandidatePayout(_accountId, _payoutId, _candidateId, totalSupport);
        }
        return paid;
    }

    function _newPeriod(uint64 _startTime) internal returns (Period storage) {
        // There should be no way for this to overflow since each period is at least one day
        uint64 newPeriodId = periodsLength++;

        Period storage period = periods[newPeriodId];
        period.startTime = _startTime;

        // Be careful here to not overflow; if startTime + periodDuration overflows, we set endTime
        // to MAX_UINT64 (let's assume that's the end of time for now).
        uint64 endTime = _startTime + periodDuration - 1;
        if (endTime < _startTime) { // overflowed
            endTime = MAX_UINT64;
        }
        period.endTime = endTime;

        emit NewPeriod(newPeriodId, period.startTime, period.endTime);

        return period;
    }

    function _tryTransitionAccountingPeriod(uint64 _maxTransitions) internal returns (bool success) {
        Period storage currentPeriod = periods[_currentPeriodId()];
        uint64 maxTransitions = _maxTransitions;
        uint64 timestamp = getTimestamp64();

        // Transition periods if necessary
        while (timestamp > currentPeriod.endTime) {
            if (maxTransitions == 0) {
                // Required number of transitions is over allowed number, return false indicating
                // it didn't fully transition
                return false;
            }
            // We're already protected from underflowing above
            maxTransitions -= 1;

            currentPeriod = _newPeriod(currentPeriod.endTime.add(1));
        }

        return true;
    }

    function _currentPeriodId() internal view returns (uint64) {
        // There is no way for this to overflow if protected by an initialization check
        return periodsLength - 1;
    }

    function _canMakePayment(uint64 _accountId, uint256 _amount) internal view returns (bool) {
        Account storage account = accounts[_accountId];
        return _getRemainingBudget(_accountId) >= _amount && vault.balance(account.token) >= _amount && _amount > 0;
    }

    function _getRemainingBudget(uint64 _accountId) internal view returns (uint256) {
        Account storage account = accounts[_accountId];
        if (!account.hasBudget) {
            return MAX_UINT256;
        }

        uint256 budget = account.budget;
        uint256 spent = periods[_currentPeriodId()].accountStatement[_accountId].expenses[account.token];

        // A budget decrease can cause the spent amount to be greater than period budget
        // If so, return 0 to not allow more spending during period
        if (spent >= budget) {
            return 0;
        }

        // We're already protected from the overflow above
        return budget - spent;
    }

    function _runPayout(uint64 _accountId, uint64 _payoutId) internal returns(bool success) {
        Account storage account = accounts[_accountId];
        uint256[] storage supports = account.payouts[_payoutId].supports;
        uint64 i;
        uint256 paid = 0;
        uint256 length = account.payouts[_payoutId].candidateAddresses.length;
        //handle vault
        for (i = 0; i < length; i++) {
            if (supports[i] != 0 && _nextPaymentTime(_accountId, _payoutId, i) <= getTimestamp64()) {
                paid = _executePayoutAtLeastOnce(_accountId, _payoutId, i, paid);
            } else {
                emit PaymentFailure(_accountId, _payoutId, i);
            }
        }
        success = true;
    }

    function _getTotalSupport(Payout storage payout) internal view returns (uint256 totalSupport) {
        for (uint256 i = 0; i < payout.supports.length; i++) {
            totalSupport += payout.supports[i];
        }
    }

    function _nextPaymentTime(uint64 _accountId, uint64 _payoutId, uint256 _candidateIndex) internal view returns (uint64) {
        Account storage account = accounts[_accountId];
        Payout storage payout = account.payouts[_payoutId];

        if (payout.executions[_candidateIndex] >= payout.recurrences) {
            return MAX_UINT64; // re-executes in some billions of years time... should not need to worry
        }

        // Split in multiple lines to circumvent linter warning
        uint64 increase = payout.executions[_candidateIndex].mul(payout.period);
        uint64 nextPayment = payout.startTime.add(increase);
        return nextPayment;
    }

    function _executeCandidatePayout(
        uint64 _accountId,
        uint64 _payoutId,
        uint256 _candidateIndex,
        uint256 _totalSupport
    ) internal
    {
        Account storage account = accounts[_accountId];
        Payout storage payout = account.payouts[_payoutId];
        uint256 individualPayout = payout.supports[_candidateIndex].mul(payout.amount).div(_totalSupport);
        require(_canMakePayment(_accountId, individualPayout), ERROR_INSUFFICIENT_FUNDS);

        address token = account.token;
        uint256 expenses = periods[_currentPeriodId()].accountStatement[_accountId].expenses[token];
        periods[_currentPeriodId()].accountStatement[_accountId].expenses[token] = expenses.add(individualPayout);
        payout.executions[_candidateIndex] = payout.executions[_candidateIndex].add(1);
        vault.transfer(token, payout.candidateAddresses[_candidateIndex], individualPayout);
        emit PayoutExecuted(_accountId, _payoutId, _candidateIndex);
    }

    // Mocked fns (overrided during testing)
    // Must be view for mocking purposes

    function getMaxPeriodTransitions() internal view returns (uint64) { return MAX_UINT64; }
}
