pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";

import "@aragon/os/contracts/lib/zeppelin/token/ERC20.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath64.sol";

import "@aragon/apps-vault/contracts/IVaultConnector.sol";

import "@aragon/os/contracts/lib/misc/Migrations.sol";


contract Finance is AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    address constant public ETH = address(0);
    uint64 constant public MAX_PAYMENTS_PER_TX = 20;
    uint64 constant public MAX_PERIOD_TRANSITIONS_PER_TX = 10;
    uint64 constant public MAX_UINT64 = uint64(-1);
    uint256 constant public MAX_UINT = uint256(-1);

    bytes32 constant public CREATE_PAYMENTS_ROLE = keccak256("CREATE_PAYMENTS_ROLE");
    bytes32 constant public CHANGE_PERIOD_ROLE = keccak256("CHANGE_PERIOD_ROLE");
    bytes32 constant public CHANGE_BUDGETS_ROLE = keccak256("CHANGE_BUDGETS_ROLE");
    bytes32 constant public EXECUTE_PAYMENTS_ROLE = keccak256("EXECUTE_PAYMENTS_ROLE");
    bytes32 constant public DISABLE_PAYMENTS_ROLE = keccak256("DISABLE_PAYMENTS_ROLE");

    // order optimized for storage
    struct Payment {
        address token;
        address receiver;
        address createdBy;
        bool disabled;
        uint64 initialPaymentTime;
        uint64 interval;
        uint64 maxRepeats;
        uint64 repeats;
        uint256 amount;
        string reference;
    }

    // order optimized for storage
    struct Transaction {
        address token;
        address entity;
        bool isIncoming;
        uint64 date;
        uint256 periodId;
        uint256 amount;
        uint256 paymentId;
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

    IVaultConnector public vault;

    Payment[] payments; // first index is 1
    Transaction[] transactions; // first index is 1
    Period[] periods; // first index is 0
    Settings settings;

    event NewPeriod(uint256 indexed periodId, uint64 periodStarts, uint64 periodEnds);
    event SetBudget(address indexed token, uint256 amount, bool hasBudget);
    event NewPayment(uint256 indexed paymentId, address indexed recipient, uint64 maxRepeats);
    event NewTransaction(uint256 indexed transactionId, bool incoming, address indexed entity);
    event ChangePaymentState(uint256 indexed paymentId, bool disabled);
    event ChangePeriodDuration(uint64 newDuration);
    event PaymentFailure(uint256 paymentId);

    // Modifier used by all methods that impact accounting to make sure accounting period
    // is changed before the operation if needed
    modifier transitionsPeriod {
        bool completeTransition = tryTransitionAccountingPeriod(MAX_PERIOD_TRANSITIONS_PER_TX);
        require(completeTransition);
        _;
    }

    /**
     * @dev Sends ETH to Vault. This contract should never receive funds,
     *      but in case it happens, this function recovers them sending them
     *      to Vault.
     * @notice Allows to send ETH from this contract to Vault, to avoid locking them in contract forever.
     */
    function () public payable {
        vault.deposit.value(this.balance)(ETH, msg.sender, this.balance, new bytes(0));
    }

    /**
    * @notice Initialize Finance app for Vault at `_vault` with period length of `(_periodDuration - _periodDuration % 86400) / 86400` day`_periodDuration >= 172800 ? 's' : ''`
    * @param _vault Address of the vault Finance will rely on (non changeable)
    * @param _periodDuration Duration in seconds of each period
    */
    function initialize(IVaultConnector _vault, uint64 _periodDuration) external onlyInit {
        initialized();

        require(_periodDuration > 1);

        vault = _vault;

        payments.length += 1;
        payments[0].disabled = true;

        transactions.length += 1;

        settings.periodDuration = _periodDuration;
        _newPeriod(uint64(getTimestamp()));
    }

    /**
    * @dev Deposit for ERC20 approved tokens
    * @notice Send `_amount` `_token.symbol(): string`
    * @param _token Address of deposited token
    * @param _amount Amount of tokens sent
    * @param _reference Reason for payment
    */
    function deposit(address _token, uint256 _amount, string _reference) external transitionsPeriod {
        _recordIncomingTransaction(
            _token,
            msg.sender,
            _amount,
            _reference
        );
        // first we need to get the tokens to Finance
        ERC20(_token).transferFrom(msg.sender, this, _amount);
        // and then approve them to vault
        ERC20(_token).approve(address(vault), _amount);
        // finally we can deposit them
        vault.deposit(_token, this, _amount, new bytes(0));
    }

    /**
    * @dev Deposit for ERC777 tokens
    * @param _operator Address who triggered the transfer, either sender for a direct send or an authorized operator for operatorSend
    * @param _from Token holder (sender or 0x for minting)
    * @param _to Tokens recipient (or 0x for burning)
    * @param _amount Number of tokens transferred, minted or burned
    * @param _userData Information attached to the transaction by the sender
    * @param _operatorData Information attached to the transaction by the operator
    */
    /*
    function tokensReceived(address _operator, address _from, address _to, uint _amount, bytes _userData, bytes _operatorData) transitionsPeriod external {
        _recordIncomingTransaction(
            msg.sender,
            _from,
            _amount,
            string(_userData)
        );
        //ERC777(msg.sender).send(adress(vault), _amount, _userData);
        //vault.deposit(msg.sender, this, _amount, _userData);
    }
    */

    /**
    * @notice Create a new payment of `_amount` `_token.symbol(): string`. `_maxRepeats > 0 ? 'It will be executed ' _maxRepeats ' times at intervals of ' (_interval - _interval % 86400) / 86400 ' days' : ''`
    * @param _token Address of token for payment
    * @param _receiver Address that will receive payment.
    * @param _amount units of token that are payed every time the payment is due.
    * @param _initialPaymentTime timestamp for when the first payment is done.
    * @param _interval number of seconds that need to pass between payment transactions.
    * @param _maxRepeats maximum instances a payment can be executed.
    * @param _reference string detailing payment reason
    */
    function newPayment(
        address _token,
        address _receiver,
        uint256 _amount,
        uint64 _initialPaymentTime,
        uint64 _interval,
        uint64 _maxRepeats,
        string _reference
    ) authP(CREATE_PAYMENTS_ROLE, arr(_token, _receiver, _amount, _interval, _maxRepeats)) transitionsPeriod external returns (uint256 paymentId)
    {

        require(settings.budgets[_token] > 0 || !settings.hasBudget[_token]); // Token must have been added to budget

        // Avoid saving payment data for 1 time immediate payments
        if (_initialPaymentTime <= getTimestamp() && _maxRepeats == 1) {
            _makePaymentTransaction(
                _token,
                _receiver,
                _amount,
                0   // unrelated to any payment id, it isn't created
            );
            return;
        }

        paymentId = payments.length++;

        Payment storage payment = payments[paymentId];
        payment.token = _token;
        payment.receiver = _receiver;
        payment.amount = _amount;
        payment.initialPaymentTime = _initialPaymentTime;
        payment.interval = _interval;
        payment.maxRepeats = _maxRepeats;
        payment.reference = _reference;
        payment.createdBy = msg.sender;

        NewPayment(paymentId, _receiver, _maxRepeats);

        if (nextPaymentTime(paymentId) <= getTimestamp())
            _executePayment(paymentId);
    }

    /**
    * @notice Change period duration to `(_periodDuration - _periodDuration % 86400) / 86400` day`_periodDuration >= 172800 ? 's' : ''`, effective for next accounting period.
    * @param _periodDuration Duration in seconds for accounting periods
    */
    function setPeriodDuration(uint64 _periodDuration) authP(CHANGE_PERIOD_ROLE, arr(uint256(_periodDuration), uint256(settings.periodDuration))) transitionsPeriod external {
        require(_periodDuration > 1);
        settings.periodDuration = _periodDuration;
        ChangePeriodDuration(_periodDuration);
    }

    /**
    * @notice Set budget for `_token.symbol(): string` to `_amount`, effective immediately.
    * @param _token Address for token
    * @param _amount New budget amount
    */
    function setBudget(address _token, uint256 _amount) authP(CHANGE_BUDGETS_ROLE, arr(_token, _amount, settings.budgets[_token])) transitionsPeriod external {
        settings.budgets[_token] = _amount;
        if (!settings.hasBudget[_token]) {
            settings.hasBudget[_token] = true;
        }
        SetBudget(_token, _amount, true);
    }

    /**
    * @notice Remove spending limit for `_token.symbol(): string`.
    * @param _token Address for token
    */
    function removeBudget(address _token) authP(CHANGE_BUDGETS_ROLE, arr(_token, uint256(0), settings.budgets[_token])) transitionsPeriod external {
        settings.hasBudget[_token] = false;
        SetBudget(_token, 0, false);
    }

    /**
    * @dev Withdraws any payment (requires certain status)
    * @notice Execute pending payment (#`_paymentId`)
    * @param _paymentId Identifier for payment
    */
    function executePayment(uint256 _paymentId) authP(EXECUTE_PAYMENTS_ROLE, arr(_paymentId)) external {
        require(nextPaymentTime(_paymentId) <= getTimestamp());

        _executePayment(_paymentId);
    }

    /**
    * @dev Always allows receiver of a payment to trigger execution
    * @notice Execute pending payment (#`_paymentId`)
    * @param _paymentId Identifier for payment
    */
    function receiverExecutePayment(uint256 _paymentId) external {
        require(nextPaymentTime(_paymentId) <= getTimestamp());
        require(payments[_paymentId].receiver == msg.sender);

        _executePayment(_paymentId);
    }

    /**
    * @notice `_disabled ? 'Disable' : 'Enable'` payment `_paymentId`
    * @param _paymentId Identifier for payment
    * @param _disabled Whether it will be disabled or enabled
    */
    function setPaymentDisabled(uint256 _paymentId, bool _disabled) authP(DISABLE_PAYMENTS_ROLE, arr(_paymentId)) external {
        payments[_paymentId].disabled = _disabled;
        ChangePaymentState(_paymentId, _disabled);
    }

    /**
     * @dev Allows make a simple payment from this contract to Vault,
            to avoid locked tokens in contract forever.
            This contract should never receive tokens with a simple transfer call,
            but in case it happens, this function allows to recover them.
     * @notice Send tokens to Vault
     * @param _token Token whose balance is going to be transferred.
     */
    function depositToVault(address _token) public {
        uint256 value = ERC20(_token).balanceOf(this);
        require(value > 0);

        _recordIncomingTransaction(
            _token,
            this,
            value,
            "Deposit to Vault"
        );
        // First we approve tokens to vault
        ERC20(_token).approve(address(vault), value);
        // then we can deposit them
        vault.deposit(_token, this, value, new bytes(0));
    }

    /**
    * @dev Transitions accounting periods if needed. For preventing OOG attacks,
           a TTL param is provided. If more that TTL periods need to be transitioned,
           it will return false.
    * @notice Transition accounting period if needed
    * @param _ttl Maximum periods that can be transitioned
    * @return success boolean indicating whether the accounting period is the correct one (if false, TTL was surpased and another call is needed)
    */
    function tryTransitionAccountingPeriod(uint256 _ttl) public returns (bool success) {
        Period storage currentPeriod = periods[currentPeriodId()];
        if (getTimestamp() <= currentPeriod.endTime)
            return true; // transition not needed yet

        // Transitioning period

        // If there were any transactions in period, record which was the last
        // In case 0 transactions occured, first and last tx id will be 0
        if (currentPeriod.firstTransactionId != 0)
            currentPeriod.lastTransactionId = transactions.length - 1;

        // new period starts at end time + 1
        Period storage newPeriod = _newPeriod(currentPeriod.endTime.add(1));

        // In case multiple periods have to be transitioned at once
        if (getTimestamp() > newPeriod.endTime) {
            if (_ttl == 0)
                return false; // if over TTL, return false indicating it didn't fully transition

            return tryTransitionAccountingPeriod(_ttl.sub(1));
        }

        return true;
    }

    // consts

    function getPayment(uint256 _paymentId) public view returns (address token, address receiver, uint256 amount, uint64 initialPaymentTime, uint64 interval, uint64 maxRepeats, string reference, bool disabled, uint256 repeats, address createdBy) {
        Payment storage payment = payments[_paymentId];

        token = payment.token;
        receiver = payment.receiver;
        amount = payment.amount;
        initialPaymentTime = payment.initialPaymentTime;
        interval = payment.interval;
        maxRepeats = payment.maxRepeats;
        repeats = payment.repeats;
        disabled = payment.disabled;
        reference = payment.reference;
        createdBy = payment.createdBy;
    }

    function getTransaction(uint256 _transactionId) public view returns (uint256 periodId, uint256 amount, uint256 paymentId, address token, address entity, bool isIncoming, uint64 date, string reference) {
        Transaction storage transaction = transactions[_transactionId];

        token = transaction.token;
        entity = transaction.entity;
        isIncoming = transaction.isIncoming;
        date = transaction.date;
        periodId = transaction.periodId;
        amount = transaction.amount;
        paymentId = transaction.paymentId;
        reference = transaction.reference;
    }

    function getPeriod(uint256 _periodId) public view returns (bool isCurrent, uint64 startTime, uint64 endTime, uint256 firstTransactionId, uint256 lastTransactionId) {
        Period storage period = periods[_periodId];

        isCurrent = currentPeriodId() == _periodId;

        startTime = period.startTime;
        endTime = period.endTime;
        firstTransactionId = period.firstTransactionId;
        lastTransactionId = period.lastTransactionId;
    }

    function getPeriodTokenStatement(uint256 _periodId, address _token) public view returns (uint256 expenses, uint256 income) {
        TokenStatement storage tokenStatement = periods[_periodId].tokenStatement[_token];
        return (tokenStatement.expenses, tokenStatement.income);
    }

    function nextPaymentTime(uint256 _paymentId) public view returns (uint64) {
        Payment memory payment = payments[_paymentId];

        if (payment.repeats >= payment.maxRepeats)
            return MAX_UINT64; // re-executes in some billions of years time... should not need to worry

        // split in multiple lines to circunvent linter warning
        uint256 increase = uint256(payment.repeats).mul(uint256(payment.interval));
        uint256 nextPayment = uint256(payment.initialPaymentTime).add(increase);
        return uint64(nextPayment);
    }

    function getPeriodDuration() public view returns (uint64 periodDuration) {
        return settings.periodDuration;
    }

    function getBudget(address _token) transitionsPeriod public view returns (uint256 budget, bool hasBudget, uint256 remainingBudget) {
        budget = settings.budgets[_token];
        hasBudget = settings.hasBudget[_token];
        remainingBudget = _getRemainingBudget(_token);
    }

    function currentPeriodId() public view returns (uint256) {
        return periods.length - 1;
    }

    // internal fns

    function _newPeriod(uint64 _startTime) internal returns (Period storage) {
        uint256 newPeriodId = periods.length++;

        Period storage period = periods[newPeriodId];
        period.startTime = _startTime;
        // endTime = startTime + periodDuration - 1
        period.endTime = _startTime.add(settings.periodDuration).sub(1);

        NewPeriod(newPeriodId, period.startTime, period.endTime);

        return period;
    }

    function _executePayment(uint256 _paymentId) transitionsPeriod internal {
        Payment storage payment = payments[_paymentId];
        require(!payment.disabled);

        uint64 payed = 0;
        while (nextPaymentTime(_paymentId) <= getTimestamp() && payed < MAX_PAYMENTS_PER_TX) {
            if (!_canMakePayment(payment.token, payment.amount)) {
                PaymentFailure(_paymentId);
                return;
            }

            payment.repeats += 1;
            payed += 1;

            _makePaymentTransaction(
                payment.token,
                payment.receiver,
                payment.amount,
                _paymentId
            );
        }
    }

    function _makePaymentTransaction(
        address _token,
        address _receiver,
        uint256 _amount,
        uint256 _paymentId
        ) internal
    {
        require(_getRemainingBudget(_token) >= _amount);
        _recordTransaction(
            false,
            _token,
            _receiver,
            _amount,
            _paymentId,
            ""
        );

        vault.transfer(_token, _receiver, _amount, new bytes(0));
    }

    function _recordIncomingTransaction(
        address _token,
        address _sender,
        uint256 _amount,
        string _reference
        ) internal
    {
        _recordTransaction(
            true, // incoming transaction
            _token,
            _sender,
            _amount,
            0, // unrelated to any existing payment
            _reference
        );
    }

    function _recordTransaction(
        bool _incoming,
        address _token,
        address _entity,
        uint256 _amount,
        uint256 _paymentId,
        string _reference
        ) internal
    {
        uint256 periodId = currentPeriodId();
        TokenStatement storage tokenStatement = periods[periodId].tokenStatement[_token];
        if (_incoming) {
            tokenStatement.income = tokenStatement.income.add(_amount);
        } else {
            tokenStatement.expenses = tokenStatement.expenses.add(_amount);
        }

        uint256 transactionId = transactions.length++;
        Transaction storage transaction = transactions[transactionId];
        transaction.periodId = periodId;
        transaction.amount = _amount;
        transaction.paymentId = _paymentId;
        transaction.isIncoming = _incoming;
        transaction.token = _token;
        transaction.entity = _entity;
        transaction.date = uint64(getTimestamp());
        transaction.reference = _reference;

        Period storage period = periods[periodId];
        if (period.firstTransactionId == 0)
            period.firstTransactionId = transactionId;

        NewTransaction(transactionId, _incoming, _entity);
    }

    function _canMakePayment(address _token, uint256 _amount) internal view returns (bool) {
        return _getRemainingBudget(_token) >= _amount && vault.balance(_token) >= _amount;
    }

    function _getRemainingBudget(address _token) internal view returns (uint256) {
        if (!settings.hasBudget[_token])
            return MAX_UINT;

        uint256 spent = periods[currentPeriodId()].tokenStatement[_token].expenses;

        // A budget decrease can cause the spent amount to be greater than period budget
        // If so, return 0 to not allow more spending during period
        if (spent >= settings.budgets[_token])
            return 0;

        return settings.budgets[_token].sub(spent);
    }

    function getTimestamp() internal view returns (uint256) { return now; }
}
