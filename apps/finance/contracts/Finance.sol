/*
 * SPDX-License-Identitifer:    GPL-3.0-or-later
 */

pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/common/IsContract.sol";

import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";

import "@aragon/apps-vault/contracts/Vault.sol";


contract Finance is EtherTokenConstant, IsContract, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    bytes32 public constant CREATE_PAYMENTS_ROLE = keccak256("CREATE_PAYMENTS_ROLE");
    bytes32 public constant CHANGE_PERIOD_ROLE = keccak256("CHANGE_PERIOD_ROLE");
    bytes32 public constant CHANGE_BUDGETS_ROLE = keccak256("CHANGE_BUDGETS_ROLE");
    bytes32 public constant EXECUTE_PAYMENTS_ROLE = keccak256("EXECUTE_PAYMENTS_ROLE");
    bytes32 public constant MANAGE_PAYMENTS_ROLE = keccak256("MANAGE_PAYMENTS_ROLE");

    uint64 public constant MAX_PAYMENTS_PER_TX = 20;

    uint256 internal constant MAX_UINT = uint256(-1);
    uint64 internal constant MAX_UINT64 = uint64(-1);
    uint256 internal constant NO_PAYMENT = 0;
    uint256 internal constant NO_TRANSACTION = 0;

    string private constant ERROR_COMPLETE_TRANSITION = "FINANCE_COMPLETE_TRANSITION";
    string private constant ERROR_NO_PAYMENT = "FINANCE_NO_PAYMENT";
    string private constant ERROR_NO_TRANSACTION = "FINANCE_NO_TRANSACTION";
    string private constant ERROR_NO_PERIOD = "FINANCE_NO_PERIOD";
    string private constant ERROR_VAULT_NOT_CONTRACT = "FINANCE_VAULT_NOT_CONTRACT";
    string private constant ERROR_INIT_PERIOD_TOO_SHORT = "FINANCE_INIT_PERIOD_TOO_SHORT";
    string private constant ERROR_SET_PERIOD_TOO_SHORT = "FINANCE_SET_PERIOD_TOO_SHORT";
    string private constant ERROR_NEW_PAYMENT_AMOUNT_ZERO = "FINANCE_NEW_PAYMENT_AMOUNT_ZERO";
    string private constant ERROR_RECOVER_AMOUNT_ZERO = "FINANCE_RECOVER_AMOUNT_ZERO";
    string private constant ERROR_DEPOSIT_AMOUNT_ZERO = "FINANCE_DEPOSIT_AMOUNT_ZERO";
    string private constant ERROR_BUDGET = "FINANCE_BUDGET";
    string private constant ERROR_EXECUTE_PAYMENT_TIME = "FINANCE_EXECUTE_PAYMENT_TIME";
    string private constant ERROR_RECEIVER_EXECUTE_PAYMENT_TIME = "FINANCE_RCVR_EXEC_PAYMENT_TIME";
    string private constant ERROR_PAYMENT_RECEIVER = "FINANCE_PAYMENT_RECEIVER";
    string private constant ERROR_TOKEN_TRANSFER_FROM_REVERTED = "FINANCE_TKN_TRANSFER_FROM_REVERT";
    string private constant ERROR_VALUE_MISMATCH = "FINANCE_VALUE_MISMATCH";
    string private constant ERROR_PAYMENT_INACTIVE = "FINANCE_PAYMENT_INACTIVE";
    string private constant ERROR_REMAINING_BUDGET = "FINANCE_REMAINING_BUDGET";

    // Order optimized for storage
    struct Payment {
        address token;
        address receiver;
        address createdBy;
        bool inactive;
        uint256 amount;
        uint64 initialPaymentTime;
        uint64 interval;
        uint64 maxRepeats;
        uint64 repeats;
        string reference;
    }

    // Order optimized for storage
    struct Transaction {
        address token;
        address entity;
        bool isIncoming;
        uint256 amount;
        uint256 paymentId;
        uint64 paymentRepeatNumber;
        uint64 date;
        uint64 periodId;
        string reference;
    }

    struct TokenStatement {
        uint256 expenses;
        uint256 income;
    }

    struct Period {
        uint64 startTime;
        uint64 endTime;
        uint256 firstTransactionId;
        uint256 lastTransactionId;

        mapping (address => TokenStatement) tokenStatement;
    }

    struct Settings {
        uint64 periodDuration;
        mapping (address => uint256) budgets;
        mapping (address => bool) hasBudget;
    }

    Vault public vault;
    Settings internal settings;

    // We are mimicing arrays, we use mappings instead to make app upgrade more graceful
    mapping (uint256 => Payment) internal payments;
    // Payments start at index 1, to allow us to use payments[0] for transactions that are not
    // linked to a recurring payment
    uint256 public paymentsNextIndex;

    mapping (uint256 => Transaction) internal transactions;
    uint256 public transactionsNextIndex;

    mapping (uint64 => Period) internal periods;
    uint64 public periodsLength;

    event NewPeriod(uint64 indexed periodId, uint64 periodStarts, uint64 periodEnds);
    event SetBudget(address indexed token, uint256 amount, bool hasBudget);
    event NewPayment(uint256 indexed paymentId, address indexed recipient, uint64 maxRepeats);
    event NewTransaction(uint256 indexed transactionId, bool incoming, address indexed entity, uint256 amount);
    event ChangePaymentState(uint256 indexed paymentId, bool inactive);
    event ChangePeriodDuration(uint64 newDuration);
    event PaymentFailure(uint256 paymentId);

    // Modifier used by all methods that impact accounting to make sure accounting period
    // is changed before the operation if needed
    // NOTE: its use **MUST** be accompanied by an initialization check
    modifier transitionsPeriod {
        bool completeTransition = _tryTransitionAccountingPeriod(getMaxPeriodTransitions());
        require(completeTransition, ERROR_COMPLETE_TRANSITION);
        _;
    }

    modifier paymentExists(uint256 _paymentId) {
        require(_paymentId > 0 && _paymentId < paymentsNextIndex, ERROR_NO_PAYMENT);
        _;
    }

    modifier transactionExists(uint256 _transactionId) {
        require(_transactionId > 0 && _transactionId < transactionsNextIndex, ERROR_NO_TRANSACTION);
        _;
    }

    modifier periodExists(uint64 _periodId) {
        require(_periodId < periodsLength, ERROR_NO_PERIOD);
        _;
    }

    /**
     * @dev Sends ETH to Vault. Sends all the available balance.
     * @notice Allows to send ETH from this contract to Vault, to avoid locking them in contract forever.
     */
    function () external payable isInitialized transitionsPeriod {
        _deposit(
            ETH,
            msg.value,
            "Ether transfer to Finance app",
            msg.sender,
            true
        );
    }

    /**
    * @notice Initialize Finance app for Vault at `_vault` with period length of `(_periodDuration - _periodDuration % 86400) / 86400` day`_periodDuration >= 172800 ? 's' : ''`
    * @param _vault Address of the vault Finance will rely on (non changeable)
    * @param _periodDuration Duration in seconds of each period
    */
    function initialize(Vault _vault, uint64 _periodDuration) external onlyInit {
        initialized();

        require(isContract(_vault), ERROR_VAULT_NOT_CONTRACT);
        vault = _vault;

        require(_periodDuration >= 1 days, ERROR_INIT_PERIOD_TOO_SHORT);
        settings.periodDuration = _periodDuration;

        // Reserve the first recurring payment index as an unused index for transactions not linked to a payment
        payments[0].inactive = true;
        paymentsNextIndex = 1;

        // Reserve the first transaction index as an unused index for periods with no transactions
        transactionsNextIndex = 1;

        // Start the first period
        _newPeriod(getTimestamp64());
    }

    /**
    * @dev Deposit for approved ERC20 tokens or ETH
    * @notice Deposit `_amount / 10^18` `_token.symbol(): string`
    * @param _token Address of deposited token
    * @param _amount Amount of tokens sent
    * @param _reference Reason for payment
    */
    function deposit(address _token, uint256 _amount, string _reference) external payable isInitialized transitionsPeriod {
        _deposit(
            _token,
            _amount,
            _reference,
            msg.sender,
            true
        );
    }

    /**
    * @notice Create a new payment of `_amount / 10^18` `_token.symbol(): string` to `_receiver`. `_maxRepeats > 0 ? 'It will be executed ' + _maxRepeats + ' times at intervals of ' + (_interval - _interval % 86400) / 86400 + ' days' : ''`
    * @param _token Address of token for payment
    * @param _receiver Address that will receive payment
    * @param _amount Tokens that are payed every time the payment is due
    * @param _initialPaymentTime Timestamp for when the first payment is done
    * @param _interval Number of seconds that need to pass between payment transactions
    * @param _maxRepeats Maximum instances a payment can be executed
    * @param _reference String detailing payment reason
    */
    function newPayment(
        address _token,
        address _receiver,
        uint256 _amount,
        uint64 _initialPaymentTime,
        uint64 _interval,
        uint64 _maxRepeats,
        string _reference
    )
        external
        authP(CREATE_PAYMENTS_ROLE, arr(_token, _receiver, _amount, _interval, _maxRepeats))
        transitionsPeriod
        returns (uint256 paymentId)
    {
        require(_amount > 0, ERROR_NEW_PAYMENT_AMOUNT_ZERO);

        // Avoid saving payment data for 1 time immediate payments
        if (_initialPaymentTime <= getTimestamp64() && _maxRepeats == 1) {
            _makePaymentTransaction(
                _token,
                _receiver,
                _amount,
                NO_PAYMENT,   // unrelated to any payment id; it isn't created
                0,   // also unrelated to any payment repeats
                _reference
            );
            return;
        }

        // Budget must allow at least one instance of this payment each period, or not be set at all
        require(settings.budgets[_token] >= _amount || !settings.hasBudget[_token], ERROR_BUDGET);

        paymentId = paymentsNextIndex++;
        emit NewPayment(paymentId, _receiver, _maxRepeats);

        Payment storage payment = payments[paymentId];
        payment.token = _token;
        payment.receiver = _receiver;
        payment.amount = _amount;
        payment.initialPaymentTime = _initialPaymentTime;
        payment.interval = _interval;
        payment.maxRepeats = _maxRepeats;
        payment.reference = _reference;
        payment.createdBy = msg.sender;

        if (nextPaymentTime(paymentId) <= getTimestamp64()) {
            _executePayment(paymentId);
        }
    }

    /**
    * @notice Change period duration to `(_periodDuration - _periodDuration % 86400) / 86400` day`_periodDuration >= 172800 ? 's' : ''`, effective for next accounting period.
    * @param _periodDuration Duration in seconds for accounting periods
    */
    function setPeriodDuration(uint64 _periodDuration)
        external
        authP(CHANGE_PERIOD_ROLE, arr(uint256(_periodDuration), uint256(settings.periodDuration)))
        transitionsPeriod
    {
        require(_periodDuration >= 1 days, ERROR_SET_PERIOD_TOO_SHORT);
        settings.periodDuration = _periodDuration;
        emit ChangePeriodDuration(_periodDuration);
    }

    /**
    * @notice Set budget for `_token.symbol(): string` to `_amount / 10^18`, effective immediately.
    * @param _token Address for token
    * @param _amount New budget amount
    */
    function setBudget(
        address _token,
        uint256 _amount
    )
        external
        authP(CHANGE_BUDGETS_ROLE, arr(_token, _amount, settings.budgets[_token], settings.hasBudget[_token] ? 1 : 0))
        transitionsPeriod
    {
        settings.budgets[_token] = _amount;
        if (!settings.hasBudget[_token]) {
            settings.hasBudget[_token] = true;
        }
        emit SetBudget(_token, _amount, true);
    }

    /**
    * @notice Remove spending limit for `_token.symbol(): string`.
    * @param _token Address for token
    */
    function removeBudget(address _token)
        external
        authP(CHANGE_BUDGETS_ROLE, arr(_token, uint256(0), settings.budgets[_token], settings.hasBudget[_token] ? 1 : 0))
        transitionsPeriod
    {
        settings.budgets[_token] = 0;
        settings.hasBudget[_token] = false;
        emit SetBudget(_token, 0, false);
    }

    /**
    * @dev Withdraws any payment (requires certain status)
    * @notice Execute pending payment #`_paymentId`
    * @param _paymentId Identifier for payment
    */
    function executePayment(uint256 _paymentId)
        external
        authP(EXECUTE_PAYMENTS_ROLE, arr(_paymentId, payments[_paymentId].amount))
        paymentExists(_paymentId)
        transitionsPeriod
    {
        require(nextPaymentTime(_paymentId) <= getTimestamp64(), ERROR_EXECUTE_PAYMENT_TIME);

        _executePayment(_paymentId);
    }

    /**
    * @dev Always allows receiver of a payment to trigger execution
    * @notice Execute pending payment #`_paymentId`
    * @param _paymentId Identifier for payment
    */
    function receiverExecutePayment(uint256 _paymentId) external isInitialized paymentExists(_paymentId) transitionsPeriod {
        require(nextPaymentTime(_paymentId) <= getTimestamp64(), ERROR_RECEIVER_EXECUTE_PAYMENT_TIME);
        require(payments[_paymentId].receiver == msg.sender, ERROR_PAYMENT_RECEIVER);

        _executePayment(_paymentId);
    }

    /**
    * @notice `_active ? 'Active' : 'Inactive'` payment `_paymentId`
    * @param _paymentId Identifier for payment
    * @param _active Whether it will be active or inactive
    */
    function setPaymentStatus(uint256 _paymentId, bool _active)
        external
        authP(MANAGE_PAYMENTS_ROLE, arr(_paymentId, uint256(_active ? 1 : 0)))
        paymentExists(_paymentId)
    {
        payments[_paymentId].inactive = !_active;
        emit ChangePaymentState(_paymentId, _active);
    }

    /**
     * @dev Allows making a simple payment from this contract to the Vault, to avoid locked tokens.
     *      This contract should never receive tokens with a simple transfer call, but in case it
     *      happens, this function allows for their recovery.
     * @notice Send tokens held in this contract to the Vault
     * @param _token Token whose balance is going to be transferred.
     */
    function recoverToVault(address _token) public isInitialized transitionsPeriod {
        uint256 amount = _token == ETH ? address(this).balance : ERC20(_token).balanceOf(this);
        require(amount > 0, ERROR_RECOVER_AMOUNT_ZERO);

        _deposit(
            _token,
            amount,
            "Recover to Vault",
            this,
            false
        );
    }

    /**
    * @dev Transitions accounting periods if needed. For preventing OOG attacks, a maxTransitions
    *      param is provided. If more than the specified number of periods need to be transitioned,
    *      it will return false.
    * @notice Transition accounting period if needed
    * @param _maxTransitions Maximum periods that can be transitioned
    * @return success Boolean indicating whether the accounting period is the correct one (if false,
    *                 maxTransitions was surpased and another call is needed)
    */
    function tryTransitionAccountingPeriod(uint64 _maxTransitions) public isInitialized returns (bool success) {
        return _tryTransitionAccountingPeriod(_maxTransitions);
    }

    // consts

    /**
    * @dev Disable recovery escape hatch if the app has been initialized, as it could be used
    *      maliciously to transfer funds in the Finance app to another Vault
    *      finance#recoverToVault() should be used to recover funds to the Finance's vault
    */
    function allowRecoverability(address) public view returns (bool) {
        return !hasInitialized();
    }

    function getPayment(uint256 _paymentId)
        public
        view
        paymentExists(_paymentId)
        returns (
            address token,
            address receiver,
            uint256 amount,
            uint64 initialPaymentTime,
            uint64 interval,
            uint64 maxRepeats,
            string reference,
            bool inactive,
            uint64 repeats,
            address createdBy
        )
    {
        Payment storage payment = payments[_paymentId];

        token = payment.token;
        receiver = payment.receiver;
        amount = payment.amount;
        initialPaymentTime = payment.initialPaymentTime;
        interval = payment.interval;
        maxRepeats = payment.maxRepeats;
        repeats = payment.repeats;
        inactive = payment.inactive;
        reference = payment.reference;
        createdBy = payment.createdBy;
    }

    function getTransaction(uint256 _transactionId)
        public
        view
        transactionExists(_transactionId)
        returns (
            uint64 periodId,
            uint256 amount,
            uint256 paymentId,
            uint64 paymentRepeatNumber,
            address token,
            address entity,
            bool isIncoming,
            uint64 date,
            string reference
        )
    {
        Transaction storage transaction = transactions[_transactionId];

        token = transaction.token;
        entity = transaction.entity;
        isIncoming = transaction.isIncoming;
        date = transaction.date;
        periodId = transaction.periodId;
        amount = transaction.amount;
        paymentId = transaction.paymentId;
        paymentRepeatNumber = transaction.paymentRepeatNumber;
        reference = transaction.reference;
    }

    function getPeriod(uint64 _periodId)
        public
        view
        periodExists(_periodId)
        returns (
            bool isCurrent,
            uint64 startTime,
            uint64 endTime,
            uint256 firstTransactionId,
            uint256 lastTransactionId
        )
    {
        Period storage period = periods[_periodId];

        isCurrent = _currentPeriodId() == _periodId;

        startTime = period.startTime;
        endTime = period.endTime;
        firstTransactionId = period.firstTransactionId;
        lastTransactionId = period.lastTransactionId;
    }

    function getPeriodTokenStatement(uint64 _periodId, address _token)
        public
        view
        periodExists(_periodId)
        returns (uint256 expenses, uint256 income)
    {
        TokenStatement storage tokenStatement = periods[_periodId].tokenStatement[_token];
        expenses = tokenStatement.expenses;
        income = tokenStatement.income;
    }

    function nextPaymentTime(uint256 _paymentId) public view paymentExists(_paymentId) returns (uint64) {
        Payment memory payment = payments[_paymentId];

        if (payment.repeats >= payment.maxRepeats) {
            return MAX_UINT64; // re-executes in some billions of years time... should not need to worry
        }

        // Split in multiple lines to circunvent linter warning
        uint64 increase = payment.repeats.mul(payment.interval);
        uint64 nextPayment = payment.initialPaymentTime.add(increase);
        return nextPayment;
    }

    function getPeriodDuration() public view returns (uint64) {
        return settings.periodDuration;
    }

    function getBudget(address _token) public view returns (uint256 budget, bool hasBudget) {
        budget = settings.budgets[_token];
        hasBudget = settings.hasBudget[_token];
    }

    /**
    * @dev We have to check for initialization as periods are only valid after initializing
    */
    function getRemainingBudget(address _token) public view isInitialized returns (uint256) {
        return _getRemainingBudget(_token);
    }

    /**
    * @dev We have to check for initialization as periods are only valid after initializing
    */
    function currentPeriodId() public view isInitialized returns (uint64) {
        return _currentPeriodId();
    }

    // internal fns

    function _deposit(address _token, uint256 _amount, string _reference, address _sender, bool _isExternalDeposit) internal {
        require(_amount > 0, ERROR_DEPOSIT_AMOUNT_ZERO);
        _recordIncomingTransaction(
            _token,
            _sender,
            _amount,
            _reference
        );

        // If it is an external deposit, check that the assets are actually transferred
        // External deposit will be false when the assets were already in the Finance app
        // and just need to be transferred to the vault
        if (_isExternalDeposit) {
            if (_token != ETH) {
                // Get the tokens to Finance
                require(ERC20(_token).transferFrom(msg.sender, this, _amount), ERROR_TOKEN_TRANSFER_FROM_REVERTED);
            } else {
                // Ensure that the ETH sent with the transaction equals the amount in the deposit
                require(msg.value == _amount, ERROR_VALUE_MISMATCH);
            }
        }

        if (_token == ETH) {
            vault.deposit.value(_amount)(ETH, _amount);
        } else {
            ERC20(_token).approve(vault, _amount);
            // finally we can deposit them
            vault.deposit(_token, _amount);
        }
    }

    function _newPeriod(uint64 _startTime) internal returns (Period storage) {
        // There should be no way for this to overflow since each period is at least one day
        uint64 newPeriodId = periodsLength++;

        Period storage period = periods[newPeriodId];
        period.startTime = _startTime;

        // Be careful here to not overflow; if startTime + periodDuration overflows, we set endTime
        // to MAX_UINT64 (let's assume that's the end of time for now).
        uint64 endTime = _startTime + settings.periodDuration - 1;
        if (endTime < _startTime) { // overflowed
            endTime = MAX_UINT64;
        }
        period.endTime = endTime;

        emit NewPeriod(newPeriodId, period.startTime, period.endTime);

        return period;
    }

    function _executePayment(uint256 _paymentId) internal {
        Payment storage payment = payments[_paymentId];
        require(!payment.inactive, ERROR_PAYMENT_INACTIVE);

        uint64 payed = 0;
        while (nextPaymentTime(_paymentId) <= getTimestamp64() && payed < MAX_PAYMENTS_PER_TX) {
            if (!_canMakePayment(payment.token, payment.amount)) {
                emit PaymentFailure(_paymentId);
                return;
            }

            // The while() predicate prevents these two from ever overflowing
            payment.repeats += 1;
            payed += 1;

            _makePaymentTransaction(
                payment.token,
                payment.receiver,
                payment.amount,
                _paymentId,
                payment.repeats,
                "" // since paymentId is saved, the payment reference can be fetched
            );
        }
    }

    function _makePaymentTransaction(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _paymentId,
        uint64 _paymentRepeatNumber,
        string _reference
    )
        internal
    {
        require(_getRemainingBudget(_token) >= _amount, ERROR_REMAINING_BUDGET);
        _recordTransaction(
            false,
            _token,
            _receiver,
            _amount,
            _paymentId,
            _paymentRepeatNumber,
            _reference
        );

        vault.transfer(_token, _receiver, _amount);
    }

    function _recordIncomingTransaction(
        address _token,
        address _sender,
        uint256 _amount,
        string _reference
    )
        internal
    {
        _recordTransaction(
            true, // incoming transaction
            _token,
            _sender,
            _amount,
            NO_PAYMENT, // unrelated to any existing payment
            0, // and no payment repeats
            _reference
        );
    }

    function _recordTransaction(
        bool _incoming,
        address _token,
        address _entity,
        uint256 _amount,
        uint256 _paymentId,
        uint64 _paymentRepeatNumber,
        string _reference
    )
        internal
    {
        uint64 periodId = _currentPeriodId();
        TokenStatement storage tokenStatement = periods[periodId].tokenStatement[_token];
        if (_incoming) {
            tokenStatement.income = tokenStatement.income.add(_amount);
        } else {
            tokenStatement.expenses = tokenStatement.expenses.add(_amount);
        }

        uint256 transactionId = transactionsNextIndex++;
        Transaction storage transaction = transactions[transactionId];
        transaction.periodId = periodId;
        transaction.amount = _amount;
        transaction.paymentId = _paymentId;
        transaction.paymentRepeatNumber = _paymentRepeatNumber;
        transaction.isIncoming = _incoming;
        transaction.token = _token;
        transaction.entity = _entity;
        transaction.date = getTimestamp64();
        transaction.reference = _reference;

        Period storage period = periods[periodId];
        if (period.firstTransactionId == NO_TRANSACTION) {
            period.firstTransactionId = transactionId;
        }

        emit NewTransaction(transactionId, _incoming, _entity, _amount);
    }

    function _tryTransitionAccountingPeriod(uint256 _maxTransitions) internal returns (bool success) {
        Period storage currentPeriod = periods[_currentPeriodId()];
        uint64 timestamp = getTimestamp64();

        // Transition periods if necessary
        while (timestamp > currentPeriod.endTime) {
            if (_maxTransitions == 0) {
                // Required number of transitions is over allowed number, return false indicating
                // it didn't fully transition
                return false;
            }
            _maxTransitions = _maxTransitions.sub(1);

            // If there were any transactions in period, record which was the last
            // In case 0 transactions occured, first and last tx id will be 0
            if (currentPeriod.firstTransactionId != NO_TRANSACTION) {
                currentPeriod.lastTransactionId = transactionsNextIndex.sub(1);
            }

            // New period starts at end time + 1
            currentPeriod = _newPeriod(currentPeriod.endTime.add(1));
        }

        return true;
    }

    function _canMakePayment(address _token, uint256 _amount) internal view returns (bool) {
        return _getRemainingBudget(_token) >= _amount && vault.balance(_token) >= _amount;
    }

    function _getRemainingBudget(address _token) internal view returns (uint256) {
        if (!settings.hasBudget[_token]) {
            return MAX_UINT;
        }

        uint256 spent = periods[_currentPeriodId()].tokenStatement[_token].expenses;

        // A budget decrease can cause the spent amount to be greater than period budget
        // If so, return 0 to not allow more spending during period
        if (spent >= settings.budgets[_token]) {
            return 0;
        }

        return settings.budgets[_token].sub(spent);
    }

    function _currentPeriodId() internal view returns (uint64) {
        // There is no way for this to overflow if protected by an initialization check
        return periodsLength - 1;
    }

    // Must be view for mocking purposes
    function getMaxPeriodTransitions() internal view returns (uint64) { return MAX_UINT64; }
}
