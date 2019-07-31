pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/common/IsContract.sol";
import "@aragon/os/contracts/common/IForwarder.sol";

import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";

import "@aragon/ppf-contracts/contracts/IFeed.sol";
import "@aragon/apps-finance/contracts/Finance.sol";


/**
 * @title Payroll in multiple currencies
 */
contract Payroll is EtherTokenConstant, IForwarder, IsContract, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    /* Hardcoded constants to save gas
    * bytes32 constant public ADD_EMPLOYEE_ROLE = keccak256("ADD_EMPLOYEE_ROLE");
    * bytes32 constant public TERMINATE_EMPLOYEE_ROLE = keccak256("TERMINATE_EMPLOYEE_ROLE");
    * bytes32 constant public SET_EMPLOYEE_SALARY_ROLE = keccak256("SET_EMPLOYEE_SALARY_ROLE");
    * bytes32 constant public ADD_BONUS_ROLE = keccak256("ADD_BONUS_ROLE");
    * bytes32 constant public ADD_REIMBURSEMENT_ROLE = keccak256("ADD_REIMBURSEMENT_ROLE");
    * bytes32 constant public MANAGE_ALLOWED_TOKENS_ROLE = keccak256("MANAGE_ALLOWED_TOKENS_ROLE");
    * bytes32 constant public MODIFY_PRICE_FEED_ROLE = keccak256("MODIFY_PRICE_FEED_ROLE");
    * bytes32 constant public MODIFY_RATE_EXPIRY_ROLE = keccak256("MODIFY_RATE_EXPIRY_ROLE");
    */

    bytes32 constant public ADD_EMPLOYEE_ROLE = 0x9ecdc3c63716b45d0756eece5fe1614cae1889ec5a1ce62b3127c1f1f1615d6e;
    bytes32 constant public TERMINATE_EMPLOYEE_ROLE = 0x69c67f914d12b6440e7ddf01961214818d9158fbcb19211e0ff42800fdea9242;
    bytes32 constant public SET_EMPLOYEE_SALARY_ROLE = 0xea9ac65018da2421cf419ee2152371440c08267a193a33ccc1e39545d197e44d;
    bytes32 constant public ADD_BONUS_ROLE = 0xceca7e2f5eb749a87aaf68f3f76d6b9251aa2f4600f13f93c5a4adf7a72df4ae;
    bytes32 constant public ADD_REIMBURSEMENT_ROLE = 0x90698b9d54427f1e41636025017309bdb1b55320da960c8845bab0a504b01a16;
    bytes32 constant public MANAGE_ALLOWED_TOKENS_ROLE = 0x0be34987c45700ee3fae8c55e270418ba903337decc6bacb1879504be9331c06;
    bytes32 constant public MODIFY_PRICE_FEED_ROLE = 0x74350efbcba8b85341c5bbf70cc34e2a585fc1463524773a12fa0a71d4eb9302;
    bytes32 constant public MODIFY_RATE_EXPIRY_ROLE = 0x79fe989a8899060dfbdabb174ebb96616fa9f1d9dadd739f8d814cbab452404e;

    uint256 internal constant MAX_ALLOWED_TOKENS = 20; // prevent OOG issues with `payday()`
    uint64 internal constant MIN_RATE_EXPIRY = uint64(1 minutes); // 1 min == ~4 block window to mine both a price feed update and a payout

    uint256 internal constant MAX_UINT256 = uint256(-1);
    uint64 internal constant MAX_UINT64 = uint64(-1);

    string private constant ERROR_EMPLOYEE_DOESNT_EXIST = "PAYROLL_EMPLOYEE_DOESNT_EXIST";
    string private constant ERROR_NON_ACTIVE_EMPLOYEE = "PAYROLL_NON_ACTIVE_EMPLOYEE";
    string private constant ERROR_SENDER_DOES_NOT_MATCH = "PAYROLL_SENDER_DOES_NOT_MATCH";
    string private constant ERROR_FINANCE_NOT_CONTRACT = "PAYROLL_FINANCE_NOT_CONTRACT";
    string private constant ERROR_TOKEN_ALREADY_SET = "PAYROLL_TOKEN_ALREADY_SET";
    string private constant ERROR_MAX_ALLOWED_TOKENS = "PAYROLL_MAX_ALLOWED_TOKENS";
    string private constant ERROR_MIN_RATES_MISMATCH = "PAYROLL_MIN_RATES_MISMATCH";
    string private constant ERROR_TOKEN_ALLOCATION_MISMATCH = "PAYROLL_TOKEN_ALLOCATION_MISMATCH";
    string private constant ERROR_NOT_ALLOWED_TOKEN = "PAYROLL_NOT_ALLOWED_TOKEN";
    string private constant ERROR_DISTRIBUTION_NOT_FULL = "PAYROLL_DISTRIBUTION_NOT_FULL";
    string private constant ERROR_INVALID_PAYMENT_TYPE = "PAYROLL_INVALID_PAYMENT_TYPE";
    string private constant ERROR_NOTHING_PAID = "PAYROLL_NOTHING_PAID";
    string private constant ERROR_CAN_NOT_FORWARD = "PAYROLL_CAN_NOT_FORWARD";
    string private constant ERROR_EMPLOYEE_NULL_ADDRESS = "PAYROLL_EMPLOYEE_NULL_ADDRESS";
    string private constant ERROR_EMPLOYEE_ALREADY_EXIST = "PAYROLL_EMPLOYEE_ALREADY_EXIST";
    string private constant ERROR_FEED_NOT_CONTRACT = "PAYROLL_FEED_NOT_CONTRACT";
    string private constant ERROR_EXPIRY_TIME_TOO_SHORT = "PAYROLL_EXPIRY_TIME_TOO_SHORT";
    string private constant ERROR_PAST_TERMINATION_DATE = "PAYROLL_PAST_TERMINATION_DATE";
    string private constant ERROR_EXCHANGE_RATE_TOO_LOW = "PAYROLL_EXCHANGE_RATE_TOO_LOW";
    string private constant ERROR_LAST_PAYROLL_DATE_TOO_BIG = "PAYROLL_LAST_DATE_TOO_BIG";
    string private constant ERROR_INVALID_REQUESTED_AMOUNT = "PAYROLL_INVALID_REQUESTED_AMT";

    enum PaymentType { Payroll, Reimbursement, Bonus }

    struct Employee {
        address accountAddress; // unique, but can be changed over time
        uint256 denominationTokenSalary; // salary per second in denomination Token
        uint256 accruedSalary; // keep track of any leftover accrued salary when changing salaries
        uint256 bonus;
        uint256 reimbursements;
        uint64 lastPayroll;
        uint64 endDate;
        address[] allocationTokenAddresses;
        mapping(address => uint256) allocationTokens;
    }

    Finance public finance;
    address public denominationToken;
    IFeed public feed;
    uint64 public rateExpiryTime;

    // Employees start at index 1, to allow us to use employees[0] to check for non-existent employees
    uint256 public nextEmployee;
    mapping(uint256 => Employee) internal employees;     // employee ID -> employee
    mapping(address => uint256) internal employeeIds;    // employee address -> employee ID

    mapping(address => bool) internal allowedTokens;

    event AddEmployee(
        uint256 indexed employeeId,
        address indexed accountAddress,
        uint256 initialDenominationSalary,
        uint64 startDate,
        string role
    );
    event TerminateEmployee(uint256 indexed employeeId, uint64 endDate);
    event SetEmployeeSalary(uint256 indexed employeeId, uint256 denominationSalary);
    event AddEmployeeAccruedSalary(uint256 indexed employeeId, uint256 amount);
    event AddEmployeeBonus(uint256 indexed employeeId, uint256 amount);
    event AddEmployeeReimbursement(uint256 indexed employeeId, uint256 amount);
    event ChangeAddressByEmployee(uint256 indexed employeeId, address indexed newAccountAddress, address indexed oldAccountAddress);
    event DetermineAllocation(uint256 indexed employeeId);
    event SendPayment(
        uint256 indexed employeeId,
        address indexed accountAddress,
        address indexed token,
        uint256 amount,
        uint256 exchangeRate,
        string paymentReference
    );
    event SetAllowedToken(address indexed token, bool allowed);
    event SetPriceFeed(address indexed feed);
    event SetRateExpiryTime(uint64 time);

    // Check employee exists by ID
    modifier employeeIdExists(uint256 _employeeId) {
        require(_employeeExists(_employeeId), ERROR_EMPLOYEE_DOESNT_EXIST);
        _;
    }

    // Check employee exists and is still active
    modifier employeeActive(uint256 _employeeId) {
        // No need to check for existence as _isEmployeeIdActive() is false for non-existent employees
        require(_isEmployeeIdActive(_employeeId), ERROR_NON_ACTIVE_EMPLOYEE);
        _;
    }

    // Check sender matches an existing employee
    modifier employeeMatches {
        require(employees[employeeIds[msg.sender]].accountAddress == msg.sender, ERROR_SENDER_DOES_NOT_MATCH);
        _;
    }

    /**
     * @notice Initialize Payroll app for Finance at `_finance` and price feed at `_priceFeed`, setting denomination token to `_token` and exchange rate expiry time to `@transformTime(_rateExpiryTime)`
     * @dev Note that we do not require _denominationToken to be a contract, as it may be a "fake"
     *      address used by the price feed to denominate fiat currencies
     * @param _finance Address of the Finance app this Payroll app will rely on for payments (non-changeable)
     * @param _denominationToken Address of the denomination token used for salary accounting
     * @param _priceFeed Address of the price feed
     * @param _rateExpiryTime Acceptable expiry time in seconds for the price feed's exchange rates
     */
    function initialize(Finance _finance, address _denominationToken, IFeed _priceFeed, uint64 _rateExpiryTime) external onlyInit {
        initialized();

        require(isContract(_finance), ERROR_FINANCE_NOT_CONTRACT);
        finance = _finance;

        denominationToken = _denominationToken;
        _setPriceFeed(_priceFeed);
        _setRateExpiryTime(_rateExpiryTime);

        // Employees start at index 1, to allow us to use employees[0] to check for non-existent employees
        nextEmployee = 1;
    }

    /**
     * @notice `_allowed ? 'Add' : 'Remove'` `_token.symbol(): string` `_allowed ? 'to' : 'from'` the set of allowed tokens
     * @param _token Address of the token to be added or removed from the list of allowed tokens for payments
     * @param _allowed Boolean to tell whether the given token should be added or removed from the list
     */
    function setAllowedToken(address _token, bool _allowed) external authP(MANAGE_ALLOWED_TOKENS_ROLE, arr(_token)) {
        require(allowedTokens[_token] != _allowed, ERROR_TOKEN_ALREADY_SET);
        allowedTokens[_token] = _allowed;
        emit SetAllowedToken(_token, _allowed);
    }

    /**
     * @notice Set the price feed for exchange rates to `_feed`
     * @param _feed Address of the new price feed instance
     */
    function setPriceFeed(IFeed _feed) external authP(MODIFY_PRICE_FEED_ROLE, arr(_feed, feed)) {
        _setPriceFeed(_feed);
    }

    /**
     * @notice Set the acceptable expiry time for the price feed's exchange rates to `@transformTime(_time)`
     * @dev Exchange rates older than the given value won't be accepted for payments and will cause payouts to revert
     * @param _time The expiration time in seconds for exchange rates
     */
    function setRateExpiryTime(uint64 _time) external authP(MODIFY_RATE_EXPIRY_ROLE, arr(uint256(_time), uint256(rateExpiryTime))) {
        _setRateExpiryTime(_time);
    }

    /**
     * @notice Add employee with address `_accountAddress` to payroll with an salary of `_initialDenominationSalary` per second, starting on `@formatDate(_startDate)`
     * @param _accountAddress Employee's address to receive payroll
     * @param _initialDenominationSalary Employee's salary, per second in denomination token
     * @param _startDate Employee's starting timestamp in seconds (it actually sets their initial lastPayroll value)
     * @param _role Employee's role
     */
    function addEmployee(address _accountAddress, uint256 _initialDenominationSalary, uint64 _startDate, string _role)
        external
        authP(ADD_EMPLOYEE_ROLE, arr(_accountAddress, _initialDenominationSalary, uint256(_startDate)))
    {
        _addEmployee(_accountAddress, _initialDenominationSalary, _startDate, _role);
    }

    /**
     * @notice Add `_amount` to bonus for employee #`_employeeId`
     * @param _employeeId Employee's identifier
     * @param _amount Amount to be added to the employee's bonuses in denomination token
     */
    function addBonus(uint256 _employeeId, uint256 _amount)
        external
        authP(ADD_BONUS_ROLE, arr(_employeeId, _amount))
        employeeActive(_employeeId)
    {
        _addBonus(_employeeId, _amount);
    }

    /**
     * @notice Add `_amount` to reimbursements for employee #`_employeeId`
     * @param _employeeId Employee's identifier
     * @param _amount Amount to be added to the employee's reimbursements in denomination token
     */
    function addReimbursement(uint256 _employeeId, uint256 _amount)
        external
        authP(ADD_REIMBURSEMENT_ROLE, arr(_employeeId, _amount))
        employeeActive(_employeeId)
    {
        _addReimbursement(_employeeId, _amount);
    }

    /**
     * @notice Set employee #`_employeeId`'s salary to `_denominationSalary` per second
     * @dev This reverts if either the employee's owed salary or accrued salary overflows, to avoid
     *      losing any accrued salary for an employee due to the employer changing their salary.
     * @param _employeeId Employee's identifier
     * @param _denominationSalary Employee's new salary, per second in denomination token
     */
    function setEmployeeSalary(uint256 _employeeId, uint256 _denominationSalary)
        external
        authP(SET_EMPLOYEE_SALARY_ROLE, arr(_employeeId, _denominationSalary, employees[_employeeId].denominationTokenSalary))
        employeeActive(_employeeId)
    {
        Employee storage employee = employees[_employeeId];

        // Accrue employee's owed salary; don't cap to revert on overflow
        uint256 owed = _getOwedSalarySinceLastPayroll(employee, false);
        _addAccruedSalary(_employeeId, owed);

        // Update employee to track the new salary and payment date
        employee.lastPayroll = getTimestamp64();
        employee.denominationTokenSalary = _denominationSalary;

        emit SetEmployeeSalary(_employeeId, _denominationSalary);
    }

    /**
     * @notice Terminate employee #`_employeeId` on `@formatDate(_endDate)`
     * @param _employeeId Employee's identifier
     * @param _endDate Termination timestamp in seconds
     */
    function terminateEmployee(uint256 _employeeId, uint64 _endDate)
        external
        authP(TERMINATE_EMPLOYEE_ROLE, arr(_employeeId, uint256(_endDate)))
        employeeActive(_employeeId)
    {
        _terminateEmployee(_employeeId, _endDate);
    }

    /**
     * @notice Change your employee account address to `_newAccountAddress`
     * @dev Initialization check is implicitly provided by `employeeMatches` as new employees can
     *      only be added via `addEmployee(),` which requires initialization.
     *      As the employee is allowed to call this, we enforce non-reentrancy.
     * @param _newAccountAddress New address to receive payments for the requesting employee
     */
    function changeAddressByEmployee(address _newAccountAddress) external employeeMatches nonReentrant {
        uint256 employeeId = employeeIds[msg.sender];
        address oldAddress = employees[employeeId].accountAddress;

        _setEmployeeAddress(employeeId, _newAccountAddress);
        // Don't delete the old address until after setting the new address to check that the
        // employee specified a new address
        delete employeeIds[oldAddress];

        emit ChangeAddressByEmployee(employeeId, _newAccountAddress, oldAddress);
    }

    /**
     * @notice Set the token distribution for your payments
     * @dev Initialization check is implicitly provided by `employeeMatches` as new employees can
     *      only be added via `addEmployee(),` which requires initialization.
     *      As the employee is allowed to call this, we enforce non-reentrancy.
     * @param _tokens Array of token addresses; they must belong to the list of allowed tokens
     * @param _distribution Array with each token's corresponding proportions (must be integers summing to 100)
     */
    function determineAllocation(address[] _tokens, uint256[] _distribution) external employeeMatches nonReentrant {
        // Check array lengthes match
        require(_tokens.length <= MAX_ALLOWED_TOKENS, ERROR_MAX_ALLOWED_TOKENS);
        require(_tokens.length == _distribution.length, ERROR_TOKEN_ALLOCATION_MISMATCH);

        uint256 employeeId = employeeIds[msg.sender];
        Employee storage employee = employees[employeeId];

        // Delete previous token allocations
        address[] memory previousAllowedTokenAddresses = employee.allocationTokenAddresses;
        for (uint256 j = 0; j < previousAllowedTokenAddresses.length; j++) {
            delete employee.allocationTokens[previousAllowedTokenAddresses[j]];
        }
        delete employee.allocationTokenAddresses;

        // Set distributions only if given tokens are allowed
        for (uint256 i = 0; i < _tokens.length; i++) {
            employee.allocationTokenAddresses.push(_tokens[i]);
            employee.allocationTokens[_tokens[i]] = _distribution[i];
        }

        _ensureEmployeeTokenAllocationsIsValid(employee);
        emit DetermineAllocation(employeeId);
    }

    /**
     * @notice Request your `_type == 0 ? 'salary' : _type == 1 ? 'reimbursements' : 'bonus'`
     * @dev Reverts if no payments were made.
     *      Initialization check is implicitly provided by `employeeMatches` as new employees can
     *      only be added via `addEmployee(),` which requires initialization.
     *      As the employee is allowed to call this, we enforce non-reentrancy.
     * @param _type Payment type being requested (Payroll, Reimbursement or Bonus)
     * @param _requestedAmount Requested amount to pay for the payment type. Must be less than or equal to total owed amount for the payment type, or zero to request all.
     * @param _minRates Array of employee's minimum acceptable rates for their allowed payment tokens
     */
    function payday(PaymentType _type, uint256 _requestedAmount, uint256[] _minRates) external employeeMatches nonReentrant {
        uint256 paymentAmount;
        uint256 employeeId = employeeIds[msg.sender];
        Employee storage employee = employees[employeeId];
        _ensureEmployeeTokenAllocationsIsValid(employee);
        require(_minRates.length == 0 || _minRates.length == employee.allocationTokenAddresses.length, ERROR_MIN_RATES_MISMATCH);

        // Do internal employee accounting
        if (_type == PaymentType.Payroll) {
            // Salary is capped here to avoid reverting at this point if it becomes too big
            // (so employees aren't DDOSed if their salaries get too large)
            // If we do use a capped value, the employee's lastPayroll date will be adjusted accordingly
            uint256 totalOwedSalary = _getTotalOwedCappedSalary(employee);
            paymentAmount = _ensurePaymentAmount(totalOwedSalary, _requestedAmount);
            _updateEmployeeAccountingBasedOnPaidSalary(employee, paymentAmount);
        } else if (_type == PaymentType.Reimbursement) {
            uint256 owedReimbursements = employee.reimbursements;
            paymentAmount = _ensurePaymentAmount(owedReimbursements, _requestedAmount);
            employee.reimbursements = owedReimbursements.sub(paymentAmount);
        } else if (_type == PaymentType.Bonus) {
            uint256 owedBonusAmount = employee.bonus;
            paymentAmount = _ensurePaymentAmount(owedBonusAmount, _requestedAmount);
            employee.bonus = owedBonusAmount.sub(paymentAmount);
        } else {
            revert(ERROR_INVALID_PAYMENT_TYPE);
        }

        // Actually transfer the owed funds
        require(_transferTokensAmount(employeeId, _type, paymentAmount, _minRates), ERROR_NOTHING_PAID);
        _removeEmployeeIfTerminatedAndPaidOut(employeeId);
    }

    // Forwarding fns

    /**
     * @dev IForwarder interface conformance. Tells whether the Payroll app is a forwarder or not.
     * @return Always true
     */
    function isForwarder() external pure returns (bool) {
        return true;
    }

    /**
     * @notice Execute desired action as an active employee
     * @dev IForwarder interface conformance. Allows active employees to run EVMScripts in the context of the Payroll app.
     * @param _evmScript Script being executed
     */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_CAN_NOT_FORWARD);
        bytes memory input = new bytes(0); // TODO: Consider input for this

        // Add the Finance app to the blacklist to disallow employees from executing actions on the
        // Finance app from Payroll's context (since Payroll requires permissions on Finance)
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(finance);

        runScript(_evmScript, input, blacklist);
    }

    /**
     * @dev IForwarder interface conformance. Tells whether a given address can forward actions or not.
     * @param _sender Address of the account intending to forward an action
     * @return True if the given address is an active employee, false otherwise
     */
    function canForward(address _sender, bytes) public view returns (bool) {
        return _isEmployeeIdActive(employeeIds[_sender]);
    }

    // Getter fns

    /**
     * @dev Return employee's identifier by their account address
     * @param _accountAddress Employee's address to receive payments
     * @return Employee's identifier
     */
    function getEmployeeIdByAddress(address _accountAddress) public view returns (uint256) {
        require(employeeIds[_accountAddress] != uint256(0), ERROR_EMPLOYEE_DOESNT_EXIST);
        return employeeIds[_accountAddress];
    }

    /**
     * @dev Return all information for employee by their ID
     * @param _employeeId Employee's identifier
     * @return Employee's address to receive payments
     * @return Employee's salary, per second in denomination token
     * @return Employee's accrued salary
     * @return Employee's bonus amount
     * @return Employee's reimbursements amount
     * @return Employee's last payment date
     * @return Employee's termination date (max uint64 if none)
     * @return Employee's allowed payment tokens
     */
    function getEmployee(uint256 _employeeId)
        public
        view
        employeeIdExists(_employeeId)
        returns (
            address accountAddress,
            uint256 denominationSalary,
            uint256 accruedSalary,
            uint256 bonus,
            uint256 reimbursements,
            uint64 lastPayroll,
            uint64 endDate,
            address[] allocationTokens
        )
    {
        Employee storage employee = employees[_employeeId];

        accountAddress = employee.accountAddress;
        denominationSalary = employee.denominationTokenSalary;
        accruedSalary = employee.accruedSalary;
        bonus = employee.bonus;
        reimbursements = employee.reimbursements;
        lastPayroll = employee.lastPayroll;
        endDate = employee.endDate;
        allocationTokens = employee.allocationTokenAddresses;
    }

    /**
     * @dev Get owed salary since last payroll for an employee. It will take into account the accrued salary as well.
     *      The result will be capped to max uint256 to avoid having an overflow.
     * @return Employee's total owed salary: current owed payroll since the last payroll date, plus the accrued salary.
     */
    function getTotalOwedSalary(uint256 _employeeId) public view employeeIdExists(_employeeId) returns (uint256) {
        return _getTotalOwedCappedSalary(employees[_employeeId]);
    }

    /**
     * @dev Get an employee's payment allocation for a token
     * @param _employeeId Employee's identifier
     * @param _token Token to query the payment allocation for
     * @return Employee's payment allocation for the token being queried
     */
    function getAllocation(uint256 _employeeId, address _token) public view employeeIdExists(_employeeId) returns (uint256) {
        return employees[_employeeId].allocationTokens[_token];
    }

    /**
     * @dev Check if a token is allowed to be used for payments
     * @param _token Address of the token to be checked
     * @return True if the given token is allowed, false otherwise
     */
    function isTokenAllowed(address _token) public view isInitialized returns (bool) {
        return allowedTokens[_token];
    }

    // Internal fns

    /**
     * @dev Set the price feed used for exchange rates
     * @param _feed Address of the new price feed instance
     */
    function _setPriceFeed(IFeed _feed) internal {
        require(isContract(_feed), ERROR_FEED_NOT_CONTRACT);
        feed = _feed;
        emit SetPriceFeed(feed);
    }

    /**
     * @dev Set the exchange rate expiry time in seconds.
     *      Exchange rates older than the given value won't be accepted for payments and will cause
     *      payouts to revert.
     * @param _time The expiration time in seconds for exchange rates
     */
    function _setRateExpiryTime(uint64 _time) internal {
        // Require a sane minimum for the rate expiry time
        require(_time >= MIN_RATE_EXPIRY, ERROR_EXPIRY_TIME_TOO_SHORT);
        rateExpiryTime = _time;
        emit SetRateExpiryTime(rateExpiryTime);
    }

    /**
     * @dev Add a new employee to Payroll
     * @param _accountAddress Employee's address to receive payroll
     * @param _initialDenominationSalary Employee's salary, per second in denomination token
     * @param _startDate Employee's starting timestamp in seconds
     * @param _role Employee's role
     */
    function _addEmployee(address _accountAddress, uint256 _initialDenominationSalary, uint64 _startDate, string _role) internal {
        uint256 employeeId = nextEmployee++;

        _setEmployeeAddress(employeeId, _accountAddress);

        Employee storage employee = employees[employeeId];
        employee.denominationTokenSalary = _initialDenominationSalary;
        employee.lastPayroll = _startDate;
        employee.endDate = MAX_UINT64;

        emit AddEmployee(employeeId, _accountAddress, _initialDenominationSalary, _startDate, _role);
    }

    /**
     * @dev Add amount to an employee's bonuses
     * @param _employeeId Employee's identifier
     * @param _amount Amount be added to the employee's bonuses in denomination token
     */
    function _addBonus(uint256 _employeeId, uint256 _amount) internal {
        Employee storage employee = employees[_employeeId];
        employee.bonus = employee.bonus.add(_amount);
        emit AddEmployeeBonus(_employeeId, _amount);
    }

    /**
     * @dev Add amount to an employee's reimbursements
     * @param _employeeId Employee's identifier
     * @param _amount Amount be added to the employee's reimbursements in denomination token
     */
    function _addReimbursement(uint256 _employeeId, uint256 _amount) internal {
        Employee storage employee = employees[_employeeId];
        employee.reimbursements = employee.reimbursements.add(_amount);
        emit AddEmployeeReimbursement(_employeeId, _amount);
    }

    /**
     * @dev Add amount to an employee's accrued salary
     * @param _employeeId Employee's identifier
     * @param _amount Amount be added to the employee's accrued salary in denomination token
     */
    function _addAccruedSalary(uint256 _employeeId, uint256 _amount) internal {
        Employee storage employee = employees[_employeeId];
        employee.accruedSalary = employee.accruedSalary.add(_amount);
        emit AddEmployeeAccruedSalary(_employeeId, _amount);
    }

    /**
     * @dev Set an employee's account address
     * @param _employeeId Employee's identifier
     * @param _accountAddress Employee's address to receive payroll
     */
    function _setEmployeeAddress(uint256 _employeeId, address _accountAddress) internal {
        // Check address is non-null
        require(_accountAddress != address(0), ERROR_EMPLOYEE_NULL_ADDRESS);
        // Check address isn't already being used
        require(employeeIds[_accountAddress] == uint256(0), ERROR_EMPLOYEE_ALREADY_EXIST);

        employees[_employeeId].accountAddress = _accountAddress;

        // Create IDs mapping
        employeeIds[_accountAddress] = _employeeId;
    }

    /**
     * @dev Terminate employee on end date
     * @param _employeeId Employee's identifier
     * @param _endDate Termination timestamp in seconds
     */
    function _terminateEmployee(uint256 _employeeId, uint64 _endDate) internal {
        // Prevent past termination dates
        require(_endDate >= getTimestamp64(), ERROR_PAST_TERMINATION_DATE);
        employees[_employeeId].endDate = _endDate;
        emit TerminateEmployee(_employeeId, _endDate);
    }

    /**
     * @dev Loop over allowed tokens to send requested amount to the employee in their desired allocation
     * @param _employeeId Employee's identifier
     * @param _totalAmount Total amount to be transferred to the employee distributed in accordance to the employee's token allocation.
     * @param _type Payment type being transferred (Payroll, Reimbursement or Bonus)
     * @param _minRates Array of employee's minimum acceptable rates for their allowed payment tokens
     * @return True if there was at least one token transfer
     */
    function _transferTokensAmount(uint256 _employeeId, PaymentType _type, uint256 _totalAmount, uint256[] _minRates) internal returns (bool somethingPaid) {
        if (_totalAmount == 0) {
            return false;
        }

        Employee storage employee = employees[_employeeId];
        address employeeAddress = employee.accountAddress;
        string memory paymentReference = _paymentReferenceFor(_type);

        address[] storage allocationTokenAddresses = employee.allocationTokenAddresses;
        for (uint256 i = 0; i < allocationTokenAddresses.length; i++) {
            address token = allocationTokenAddresses[i];
            uint256 tokenAllocation = employee.allocationTokens[token];
            if (tokenAllocation != uint256(0)) {
                // Get the exchange rate for the payout token in denomination token,
                // as we do accounting in denomination tokens
                uint256 exchangeRate = _getExchangeRateInDenominationToken(token);
                require(_minRates.length > 0 ? exchangeRate >= _minRates[i] : exchangeRate > 0, ERROR_EXCHANGE_RATE_TOO_LOW);

                // Convert amount (in denomination tokens) to payout token and apply allocation
                uint256 tokenAmount = _totalAmount.mul(exchangeRate).mul(tokenAllocation);
                // Divide by 100 for the allocation percentage and by the exchange rate precision
                tokenAmount = tokenAmount.div(100).div(feed.ratePrecision());

                // Finance reverts if the payment wasn't possible
                finance.newImmediatePayment(token, employeeAddress, tokenAmount, paymentReference);
                emit SendPayment(_employeeId, employeeAddress, token, tokenAmount, exchangeRate, paymentReference);
                somethingPaid = true;
            }
        }
    }

    /**
     * @dev Remove employee if there are no owed funds and employee's end date has been reached
     * @param _employeeId Employee's identifier
     */
    function _removeEmployeeIfTerminatedAndPaidOut(uint256 _employeeId) internal {
        Employee storage employee = employees[_employeeId];

        if (
            employee.lastPayroll == employee.endDate &&
            (employee.accruedSalary == 0 && employee.bonus == 0 && employee.reimbursements == 0)
        ) {
            delete employeeIds[employee.accountAddress];
            delete employees[_employeeId];
        }
    }

    /**
     * @dev Updates the accrued salary and payroll date of an employee based on a payment amount and
     *      their currently owed salary since last payroll date
     * @param _employee Employee struct in storage
     * @param _paymentAmount Amount being paid to the employee
     */
    function _updateEmployeeAccountingBasedOnPaidSalary(Employee storage _employee, uint256 _paymentAmount) internal {
        uint256 accruedSalary = _employee.accruedSalary;

        if (_paymentAmount <= accruedSalary) {
            // Employee is only cashing out some previously owed salary so we don't need to update
            // their last payroll date
            // No need to use SafeMath as we already know _paymentAmount <= accruedSalary
            _employee.accruedSalary = accruedSalary - _paymentAmount;
            return;
        }

        // Employee is cashing out some of their currently owed salary so their last payroll date
        // needs to be modified based on the amount of salary paid
        uint256 currentSalaryPaid = _paymentAmount;
        if (accruedSalary > 0) {
            // Employee is cashing out a mixed amount between previous and current owed salaries;
            // first use up their accrued salary
            // No need to use SafeMath here as we already know _paymentAmount > accruedSalary
            currentSalaryPaid = _paymentAmount - accruedSalary;
            // We finally need to clear their accrued salary
            _employee.accruedSalary = 0;
        }

        uint256 salary = _employee.denominationTokenSalary;
        uint256 timeDiff = currentSalaryPaid.div(salary);

        // If they're being paid an amount that doesn't match perfectly with the adjusted time
        // (up to a seconds' worth of salary), add the second and put the extra remaining salary
        // into their accrued salary
        uint256 extraSalary = currentSalaryPaid % salary;
        if (extraSalary > 0) {
            timeDiff = timeDiff.add(1);
            _employee.accruedSalary = salary - extraSalary;
        }

        uint256 lastPayrollDate = uint256(_employee.lastPayroll).add(timeDiff);
        // Even though this function should never receive a currentSalaryPaid value that would
        // result in the lastPayrollDate being higher than the current time,
        // let's double check to be safe
        require(lastPayrollDate <= uint256(getTimestamp64()), ERROR_LAST_PAYROLL_DATE_TOO_BIG);
        // Already know lastPayrollDate must fit in uint64 from above
        _employee.lastPayroll = uint64(lastPayrollDate);
    }

    /**
     * @dev Tell whether an employee is registered in this Payroll or not
     * @param _employeeId Employee's identifier
     * @return True if the given employee ID belongs to an registered employee, false otherwise
     */
    function _employeeExists(uint256 _employeeId) internal view returns (bool) {
        return employees[_employeeId].accountAddress != address(0);
    }

    /**
     * @dev Tell whether an employee has a valid token allocation or not.
     *      A valid allocation is one that sums to 100 and only includes allowed tokens.
     * @param _employee Employee struct in storage
     * @return Reverts if employee's allocation is invalid
     */
    function _ensureEmployeeTokenAllocationsIsValid(Employee storage _employee) internal view {
        uint256 sum = 0;
        address[] memory allocationTokenAddresses = _employee.allocationTokenAddresses;
        for (uint256 i = 0; i < allocationTokenAddresses.length; i++) {
            address token = allocationTokenAddresses[i];
            require(allowedTokens[token], ERROR_NOT_ALLOWED_TOKEN);
            sum = sum.add(_employee.allocationTokens[token]);
        }
        require(sum == 100, ERROR_DISTRIBUTION_NOT_FULL);
    }

    /**
     * @dev Tell whether an employee is still active or not
     * @param _employee Employee struct in storage
     * @return True if the employee exists and has an end date that has not been reached yet, false otherwise
     */
    function _isEmployeeActive(Employee storage _employee) internal view returns (bool) {
        return _employee.endDate >= getTimestamp64();
    }

    /**
     * @dev Tell whether an employee id is still active or not
     * @param _employeeId Employee's identifier
     * @return True if the employee exists and has an end date that has not been reached yet, false otherwise
     */
    function _isEmployeeIdActive(uint256 _employeeId) internal view returns (bool) {
        return _isEmployeeActive(employees[_employeeId]);
    }

    /**
     * @dev Get exchange rate for a token based on the denomination token.
     *      As an example, if the denomination token was USD and ETH's price was 100USD,
     *      this would return 0.01 * precision rate for ETH.
     * @param _token Token to get price of in denomination tokens
     * @return Exchange rate (multiplied by the PPF rate precision)
     */
    function _getExchangeRateInDenominationToken(address _token) internal view returns (uint256) {
        // xrt is the number of `_token` that can be exchanged for one `denominationToken`
        (uint128 xrt, uint64 when) = feed.get(
            denominationToken,  // Base (e.g. USD)
            _token              // Quote (e.g. ETH)
        );

        // Check the price feed is recent enough
        if (getTimestamp64().sub(when) >= rateExpiryTime) {
            return 0;
        }

        return uint256(xrt);
    }

    /**
     * @dev Get owed salary since last payroll for an employee
     * @param _employee Employee struct in storage
     * @param _capped Safely cap the owed salary at max uint
     * @return Owed salary in denomination tokens since last payroll for the employee.
     *         If _capped is false, it reverts in case of an overflow.
     */
    function _getOwedSalarySinceLastPayroll(Employee storage _employee, bool _capped) internal view returns (uint256) {
        uint256 timeDiff = _getOwedPayrollPeriod(_employee);
        if (timeDiff == 0) {
            return 0;
        }
        uint256 salary = _employee.denominationTokenSalary;

        if (_capped) {
            // Return max uint if the result overflows
            uint256 result = salary * timeDiff;
            return (result / timeDiff != salary) ? MAX_UINT256 : result;
        } else {
            return salary.mul(timeDiff);
        }
    }

    /**
     * @dev Get owed payroll period for an employee
     * @param _employee Employee struct in storage
     * @return Owed time in seconds since the employee's last payroll date
     */
    function _getOwedPayrollPeriod(Employee storage _employee) internal view returns (uint256) {
        // Get the min of current date and termination date
        uint64 date = _isEmployeeActive(_employee) ? getTimestamp64() : _employee.endDate;

        // Make sure we don't revert if we try to get the owed salary for an employee whose last
        // payroll date is now or in the future
        // This can happen either by adding new employees with start dates in the future, to allow
        // us to change their salary before their start date, or by terminating an employee and
        // paying out their full owed salary
        if (date <= _employee.lastPayroll) {
            return 0;
        }

        // Return time diff in seconds, no need to use SafeMath as the underflow was covered by the previous check
        return uint256(date - _employee.lastPayroll);
    }

    /**
     * @dev Get owed salary since last payroll for an employee. It will take into account the accrued salary as well.
     *      The result will be capped to max uint256 to avoid having an overflow.
     * @param _employee Employee struct in storage
     * @return Employee's total owed salary: current owed payroll since the last payroll date, plus the accrued salary.
     */
    function _getTotalOwedCappedSalary(Employee storage _employee) internal view returns (uint256) {
        uint256 currentOwedSalary = _getOwedSalarySinceLastPayroll(_employee, true); // cap amount
        uint256 totalOwedSalary = currentOwedSalary + _employee.accruedSalary;
        if (totalOwedSalary < currentOwedSalary) {
            totalOwedSalary = MAX_UINT256;
        }
        return totalOwedSalary;
    }

    /**
     * @dev Get payment reference for a given payment type
     * @param _type Payment type to query the reference of
     * @return Payment reference for the given payment type
     */
    function _paymentReferenceFor(PaymentType _type) internal pure returns (string memory) {
        if (_type == PaymentType.Payroll) {
            return "Employee salary";
        } else if (_type == PaymentType.Reimbursement) {
            return "Employee reimbursement";
        } if (_type == PaymentType.Bonus) {
            return "Employee bonus";
        }
        revert(ERROR_INVALID_PAYMENT_TYPE);
    }

    function _ensurePaymentAmount(uint256 _owedAmount, uint256 _requestedAmount) private pure returns (uint256) {
        require(_owedAmount > 0, ERROR_NOTHING_PAID);
        require(_owedAmount >= _requestedAmount, ERROR_INVALID_REQUESTED_AMOUNT);
        return _requestedAmount > 0 ? _requestedAmount : _owedAmount;
    }
}
