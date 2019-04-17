pragma solidity 0.4.24;


import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/EtherTokenConstant.sol";
import "@aragon/os/contracts/common/IsContract.sol";
import "@aragon/os/contracts/common/IForwarder.sol";

import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/os/contracts/lib/math/SafeMath8.sol";

import "@aragon/ppf-contracts/contracts/IFeed.sol";
import "@aragon/apps-finance/contracts/Finance.sol";


/**
 * @title Payroll in multiple currencies
 */
contract Payroll is EtherTokenConstant, IForwarder, IsContract, AragonApp {
    using SafeMath for uint256;
    using SafeMath64 for uint64;

    bytes32 constant public ADD_EMPLOYEE_ROLE = keccak256("ADD_EMPLOYEE_ROLE");
    bytes32 constant public TERMINATE_EMPLOYEE_ROLE = keccak256("TERMINATE_EMPLOYEE_ROLE");
    bytes32 constant public SET_EMPLOYEE_SALARY_ROLE = keccak256("SET_EMPLOYEE_SALARY_ROLE");
    bytes32 constant public ADD_REIMBURSEMENT_ROLE = keccak256("ADD_REIMBURSEMENT_ROLE");
    bytes32 constant public ADD_BONUS_ROLE = keccak256("ADD_BONUS_ROLE");
    bytes32 constant public ALLOWED_TOKENS_MANAGER_ROLE = keccak256("ALLOWED_TOKENS_MANAGER_ROLE");
    bytes32 constant public CHANGE_PRICE_FEED_ROLE = keccak256("CHANGE_PRICE_FEED_ROLE");
    bytes32 constant public MODIFY_RATE_EXPIRY_ROLE = keccak256("MODIFY_RATE_EXPIRY_ROLE");

    uint128 internal constant ONE = 10 ** 18; // 10^18 is considered 1 in the price feed to allow for decimal calculations
    uint256 internal constant MAX_ALLOWED_TOKENS = 20; // for loop in `payday()` uses ~270k gas per token
    uint256 internal constant MAX_UINT256 = uint256(-1);
    uint64 internal constant MAX_UINT64 = uint64(-1);

    string private constant ERROR_EMPLOYEE_DOESNT_EXIST = "PAYROLL_EMPLOYEE_DOESNT_EXIST";
    string private constant ERROR_NON_ACTIVE_EMPLOYEE = "PAYROLL_NON_ACTIVE_EMPLOYEE";
    string private constant ERROR_EMPLOYEE_DOES_NOT_MATCH = "PAYROLL_EMPLOYEE_DOES_NOT_MATCH";
    string private constant ERROR_FINANCE_NOT_CONTRACT = "PAYROLL_FINANCE_NOT_CONTRACT";
    string private constant ERROR_TOKEN_ALREADY_ALLOWED = "PAYROLL_TOKEN_ALREADY_ALLOWED";
    string private constant ERROR_MAX_ALLOWED_TOKENS = "PAYROLL_MAX_ALLOWED_TOKENS";
    string private constant ERROR_TOKEN_ALLOCATION_MISMATCH = "PAYROLL_TOKEN_ALLOCATION_MISMATCH";
    string private constant ERROR_NO_ALLOWED_TOKEN = "PAYROLL_NO_ALLOWED_TOKEN";
    string private constant ERROR_DISTRIBUTION_NO_COMPLETE = "PAYROLL_DISTRIBUTION_NO_COMPLETE";
    string private constant ERROR_NOTHING_PAID = "PAYROLL_NOTHING_PAID";
    string private constant ERROR_EMPLOYEE_ALREADY_EXIST = "PAYROLL_EMPLOYEE_ALREADY_EXIST";
    string private constant ERROR_EMPLOYEE_NULL_ADDRESS = "PAYROLL_EMPLOYEE_NULL_ADDRESS";
    string private constant ERROR_NO_FORWARD = "PAYROLL_NO_FORWARD";
    string private constant ERROR_FEED_NOT_CONTRACT = "PAYROLL_FEED_NOT_CONTRACT";
    string private constant ERROR_EXPIRY_TIME_TOO_SHORT = "PAYROLL_EXPIRY_TIME_TOO_SHORT";
    string private constant ERROR_EXCHANGE_RATE_ZERO = "PAYROLL_EXCHANGE_RATE_ZERO";
    string private constant ERROR_PAST_TERMINATION_DATE = "PAYROLL_PAST_TERMINATION_DATE";
    string private constant ERROR_LAST_PAYROLL_DATE_TOO_BIG = "PAYROLL_LAST_DATE_TOO_BIG";
    string private constant ERROR_INVALID_REQUESTED_AMOUNT = "PAYROLL_INVALID_REQUESTED_AMT";
    string private constant ERROR_INVALID_PAYMENT_TYPE = "PAYROLL_INVALID_PAYMENT_TYPE";

    enum PaymentType { Payroll, Reimbursement, Bonus }

    struct Employee {
        address accountAddress; // unique, but can be changed over time
        mapping(address => uint256) allocation;
        uint256 denominationTokenSalary; // per second in denomination Token
        uint256 bonus;
        uint256 reimbursements;
        uint256 accruedSalary;
        uint64 lastPayroll;
        uint64 endDate;
    }

    Finance public finance;
    IFeed public feed;
    address public denominationToken;
    uint64 public rateExpiryTime;

    // Employees start at index 1, to allow us to use employees[0] to check for non-existent address
    uint256 public nextEmployee;
    mapping(address => uint256) internal employeeIds;    // employee address -> employee ID
    mapping(uint256 => Employee) internal employees;     // employee ID -> employee
    mapping(address => bool) internal allowedTokens;
    address[] internal allowedTokensArray;

    event AddAllowedToken(address token);
    event SetEmployeeSalary(uint256 indexed employeeId, uint256 denominationSalary);
    event AddEmployeeBonus(uint256 indexed employeeId, uint256 amount);
    event AddEmployeeReimbursement(uint256 indexed employeeId, uint256 amount);
    event AddEmployeeAccruedSalary(uint256 indexed employeeId, uint256 amount);
    event TerminateEmployee(uint256 indexed employeeId, address indexed accountAddress, uint64 endDate);
    event ChangeAddressByEmployee(uint256 indexed employeeId, address indexed oldAddress, address indexed newAddress);
    event DetermineAllocation(uint256 indexed employeeId, address indexed employee);
    event SendPayment(address indexed employee, address indexed token, uint256 amount, string paymentReference);
    event SetPriceFeed(address indexed feed);
    event SetRateExpiryTime(uint64 time);
    event AddEmployee(
        uint256 indexed employeeId,
        address indexed accountAddress,
        uint256 initialDenominationSalary,
        string role,
        uint64 startDate
    );

    // Check employee exists by address
    modifier employeeAddressExists(address _accountAddress) {
        require(_employeeExists(_accountAddress), ERROR_EMPLOYEE_DOESNT_EXIST);
        _;
    }

    // Check employee exists by ID
    modifier employeeIdExists(uint256 _employeeId) {
        require(_employeeExists(_employeeId), ERROR_EMPLOYEE_DOESNT_EXIST);
        _;
    }

    // Check employee exists and is still active
    modifier employeeActive(uint256 _employeeId) {
        require(_employeeExists(_employeeId) && _isEmployeeActive(_employeeId), ERROR_NON_ACTIVE_EMPLOYEE);
        _;
    }

    // Check employee exists and the sender matches
    modifier employeeMatches {
        require(employees[employeeIds[msg.sender]].accountAddress == msg.sender, ERROR_EMPLOYEE_DOES_NOT_MATCH);
        _;
    }

    /**
     * @notice Initialize Payroll app for Finance at `_finance` and price feed at `_priceFeed`, setting denomination token to `_token.symbol(): string` and exchange rate expiry time to `@transformTime(_rateExpiryTime)`
     * @param _finance Address of the Finance app this Payroll will rely on (non-changeable)
     * @param _denominationToken Address of the denomination token
     * @param _priceFeed Address of the price feed
     * @param _rateExpiryTime Exchange rate expiry time in seconds
     */
    function initialize(Finance _finance, address _denominationToken, IFeed _priceFeed, uint64 _rateExpiryTime) external onlyInit {
        require(isContract(_finance), ERROR_FINANCE_NOT_CONTRACT);

        initialized();

        // Employees start at index 1, to allow us to use employees[0] to check for non-existent address
        nextEmployee = 1;
        finance = _finance;
        denominationToken = _denominationToken;
        _setPriceFeed(_priceFeed);
        _setRateExpiryTime(_rateExpiryTime);
    }

    /**
     * @notice Set the price feed for exchange rates to `_feed`
     * @param _feed Address of the new price feed instance
     */
    function setPriceFeed(IFeed _feed) external authP(CHANGE_PRICE_FEED_ROLE, arr(_feed, feed)) {
        _setPriceFeed(_feed);
    }

    /**
     * @notice Set the exchange rate expiry time to `@transformTime(_time)`
     * @dev Set the exchange rate expiry time in seconds. Exchange rates older than it won't be accepted for payments
     * @param _time The expiration time in seconds for exchange rates
     */
    function setRateExpiryTime(uint64 _time) external authP(MODIFY_RATE_EXPIRY_ROLE, arr(uint256(_time), uint256(rateExpiryTime))) {
        _setRateExpiryTime(_time);
    }

    /**
     * @notice Add `_allowedToken` to the set of allowed tokens
     * @param _allowedToken New token address to be allowed for payments
     */
    function addAllowedToken(address _allowedToken) external authP(ALLOWED_TOKENS_MANAGER_ROLE, arr(_allowedToken)) {
        require(!allowedTokens[_allowedToken], ERROR_TOKEN_ALREADY_ALLOWED);
        require(allowedTokensArray.length < MAX_ALLOWED_TOKENS, ERROR_MAX_ALLOWED_TOKENS);

        allowedTokens[_allowedToken] = true;
        allowedTokensArray.push(_allowedToken);

        emit AddAllowedToken(_allowedToken);
    }

    /**
     * @notice Add employee with address `_accountAddress` to Payroll with a salary of `_initialDenominationSalary` per second
     * @param _accountAddress Employee's address to receive payroll
     * @param _initialDenominationSalary Employee's salary, per second in denomination token
     * @param _role Employee's role
     */
    function addEmployeeNow(address _accountAddress, uint256 _initialDenominationSalary, string _role)
        external
        authP(ADD_EMPLOYEE_ROLE, arr(_accountAddress, _initialDenominationSalary, getTimestamp()))
    {
        _addEmployee(_accountAddress, _initialDenominationSalary, _role, getTimestamp64());
    }

    /**
     * @notice Add employee with address `_accountAddress` to Payroll with a salary of `_initialDenominationSalary` per second, starting on `@transformTime(_startDate)`
     * @param _accountAddress Employee's address to receive payroll
     * @param _initialDenominationSalary Employee's salary, per second in denomination token
     * @param _role Employee's role
     * @param _startDate Employee's starting timestamp in seconds (it actually sets their initial lastPayroll value)
     */
    function addEmployee(address _accountAddress, uint256 _initialDenominationSalary, string _role, uint64 _startDate)
        external
        authP(ADD_EMPLOYEE_ROLE, arr(_accountAddress, _initialDenominationSalary, _startDate))
    {
        _addEmployee(_accountAddress, _initialDenominationSalary, _role, _startDate);
    }

    /**
     * @notice Set employee #`_employeeId`'s annual salary to `_denominationSalary` per second
     * @param _employeeId Employee's identifier
     * @param _denominationSalary Employee's new salary, per second in denomination token
     */
    function setEmployeeSalary(uint256 _employeeId, uint256 _denominationSalary)
        external
        authP(SET_EMPLOYEE_SALARY_ROLE, arr(_employeeId, _denominationSalary))
        employeeActive(_employeeId)
    {
        // Accrue employee's owed salary
        uint256 owed = _getCurrentOwedSalary(_employeeId);
        _addAccruedSalary(_employeeId, owed);

        // Update employee to track the new salary and payment date
        Employee storage employee = employees[_employeeId];
        employee.lastPayroll = getTimestamp64();
        employee.denominationTokenSalary = _denominationSalary;

        emit SetEmployeeSalary(_employeeId, _denominationSalary);
    }

    /**
     * @notice Terminate employee #`_employeeId`
     * @param _employeeId Employee's identifier
     */
    function terminateEmployeeNow(uint256 _employeeId)
        external
        authP(TERMINATE_EMPLOYEE_ROLE, arr(_employeeId))
        employeeActive(_employeeId)
    {
        _terminateEmployeeAt(_employeeId, getTimestamp64());
    }

    /**
     * @notice Terminate employee #`_employeeId` on `@formatDate(_endDate)`
     * @param _employeeId Employee's identifier
     * @param _endDate Termination timestamp in seconds
     */
    function terminateEmployee(uint256 _employeeId, uint64 _endDate)
        external
        authP(TERMINATE_EMPLOYEE_ROLE, arr(_employeeId))
        employeeActive(_employeeId)
    {
        _terminateEmployeeAt(_employeeId, _endDate);
    }

    /**
     * @notice Add `_amount` to bonus for employee #`_employeeId`
     * @param _employeeId Employee's identifier
     * @param _amount Amount to be added to the employee's bonus amount
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
     * @param _amount Amount to be added to the employee's reimbursements
     */
    function addReimbursement(uint256 _employeeId, uint256 _amount)
        external
        authP(ADD_REIMBURSEMENT_ROLE, arr(_employeeId, _amount))
        employeeActive(_employeeId)
    {
        _addReimbursement(_employeeId, _amount);
    }

    /**
     * @notice Set token distribution for payments to an employee (the caller)
     * @dev Initialization check is implicitly provided by `employeeMatches()` as new employees can
     *      only be added via `addEmployee(),` which requires initialization
     * @param _tokens Array with the tokens to receive, they must belong to allowed tokens for employee
     * @param _distribution Array, correlated to tokens, with their corresponding proportions (integers summing to 100)
     */
    function determineAllocation(address[] _tokens, uint256[] _distribution) external employeeMatches {
        // Check arrays match
        require(_tokens.length == _distribution.length, ERROR_TOKEN_ALLOCATION_MISMATCH);

        uint256 employeeId = employeeIds[msg.sender];
        Employee storage employee = employees[employeeId];

        // Delete previous allocation
        for (uint256 j = 0; j < allowedTokensArray.length; j++) {
            delete employee.allocation[allowedTokensArray[j]];
        }

        // Check distribution sums to 100
        uint256 sum = 0;
        for (uint256 i = 0; i < _distribution.length; i++) {
            // Check token is allowed
            require(allowedTokens[_tokens[i]], ERROR_NO_ALLOWED_TOKEN);
            // Set distribution
            employee.allocation[_tokens[i]] = _distribution[i];
            sum = sum.add(_distribution[i]);
        }
        require(sum == 100, ERROR_DISTRIBUTION_NO_COMPLETE);

        emit DetermineAllocation(employeeId, msg.sender);
    }

    /**
     * @notice Request employee's payments
     * @dev Withdraw employee's owed payments (the caller).
     *      Initialization check is implicitly provided by `employeeMatches()` as new employees can only be added via `addEmployee(),` which requires initialization
     * @param _type Payment type being requested (Payroll, Reimbursement or Bonus)
     * @param _requestedAmount Requested amount of the total owed to the employee for the requested payment type. Must be less or equal than total owed so far, or zero to request all owed amount
     */
    function payday(PaymentType _type, uint256 _requestedAmount) external employeeMatches {
        uint256 paymentAmount;
        uint256 employeeId = employeeIds[msg.sender];
        Employee storage employee = employees[employeeId];

        if (_type == PaymentType.Payroll) {
            (uint256 currentOwedSalary, uint256 totalOwedSalary) = _getOwedSalaries(employeeId);
            paymentAmount = _ensurePaymentAmount(totalOwedSalary, _requestedAmount);
            _updateEmployeeStatusBasedOnPaidPayroll(employeeId, paymentAmount, currentOwedSalary);
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

        require(_transferTokensAmount(employeeId, _type, paymentAmount), ERROR_NOTHING_PAID);
        _removeEmployeeIfTerminatedAndPaidOut(employeeId);
    }

    /**
     * @notice Change your employee account address to `_newAddress`
     * @dev Change employee's account address. Must be called by employee from their registered address.
     *      Initialization check is implicitly provided by `employeeMatches()` as new employees can
     *      only be added via `addEmployee(),` which requires initialization
     * @param _newAddress New address to receive payments for the requesting employee
     */
    function changeAddressByEmployee(address _newAddress) external employeeMatches {
        // Check address is non-null
        require(_newAddress != address(0), ERROR_EMPLOYEE_NULL_ADDRESS);
        // Check address isn't already being used
        require(!_employeeExists(_newAddress), ERROR_EMPLOYEE_ALREADY_EXIST);

        uint256 employeeId = employeeIds[msg.sender];
        Employee storage employee = employees[employeeId];
        address oldAddress = employee.accountAddress;

        employee.accountAddress = _newAddress;
        employeeIds[_newAddress] = employeeId;
        delete employeeIds[msg.sender];

        emit ChangeAddressByEmployee(employeeId, oldAddress, _newAddress);
    }

    // Forwarding fns

    /**
     * @dev IForwarder interface conformance. Tells whether the payroll is a forwarder or not
     * @return Always true
     */
    function isForwarder() external pure returns (bool) {
        return true;
    }

    /**
     * @dev IForwarder interface conformance. Forwards any employee action
     * @param _evmScript Script being executed
     */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_NO_FORWARD);
        bytes memory input = new bytes(0); // TODO: Consider input for this
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(finance);
        runScript(_evmScript, input, blacklist);
    }

    /**
     * @dev IForwarder interface conformance. Tells whether a given address can forward actions or not
     * @param _sender Address of the account willing to forward an action
     * @return True if the given address is an employee, false otherwise
     */
    function canForward(address _sender, bytes) public view returns (bool) {
        // Check employee exists (and matches)
        return (employees[employeeIds[_sender]].accountAddress == _sender);
    }

    // Getter fns

    /**
     * @dev Return all information for employee by their address
     * @param _accountAddress Employee's address to receive payments
     * @return Employee's identifier
     * @return Employee's annual salary, per second in denomination token
     * @return Employee's bonus amount
     * @return Employee's reimbursements amount
     * @return Employee's accrued salary
     * @return Employee's last payment date
     * @return Employee's termination date (max uint64 if none)
     */
    function getEmployeeByAddress(address _accountAddress)
        public
        view
        employeeAddressExists(_accountAddress)
        returns (
            uint256 employeeId,
            uint256 denominationSalary,
            uint256 bonus,
            uint256 reimbursements,
            uint256 accruedSalary,
            uint64 lastPayroll,
            uint64 endDate
        )
    {
        employeeId = employeeIds[_accountAddress];

        Employee storage employee = employees[employeeId];

        denominationSalary = employee.denominationTokenSalary;
        bonus = employee.bonus;
        reimbursements = employee.reimbursements;
        accruedSalary = employee.accruedSalary;
        lastPayroll = employee.lastPayroll;
        endDate = employee.endDate;
    }

    /**
     * @dev Return all information for employee by their ID
     * @param _employeeId Employee's identifier
     * @return Employee's address to receive payments
     * @return Employee's annual salary, per second in denomination token
     * @return Employee's bonus amount
     * @return Employee's reimbursements amount
     * @return Employee's accrued salary
     * @return Employee's last payment date
     * @return Employee's termination date (max uint64 if none)
     */
    function getEmployee(uint256 _employeeId)
        public
        view
        employeeIdExists(_employeeId)
        returns (
            address accountAddress,
            uint256 denominationSalary,
            uint256 bonus,
            uint256 reimbursements,
            uint256 accruedSalary,
            uint64 lastPayroll,
            uint64 endDate
        )
    {
        Employee storage employee = employees[_employeeId];

        accountAddress = employee.accountAddress;
        denominationSalary = employee.denominationTokenSalary;
        bonus = employee.bonus;
        reimbursements = employee.reimbursements;
        accruedSalary = employee.accruedSalary;
        lastPayroll = employee.lastPayroll;
        endDate = employee.endDate;
    }

    /**
     * @notice Get an employee's payment allocation for a token
     * @param _employeeId Employee's identifier
     * @param _token Token to query the payment allocation for
     * @return Employee's payment allocation for the token being queried
     */
    function getAllocation(uint256 _employeeId, address _token) public view employeeIdExists(_employeeId) returns (uint256 allocation) {
        return employees[_employeeId].allocation[_token];
    }

    /**
     * @dev Check if a token is allowed to be used in this app
     * @param _token Address of the token to be checked
     * @return True if the given token is allowed, false otherwise
     */
    function isTokenAllowed(address _token) public view isInitialized returns (bool) {
        return allowedTokens[_token];
    }

    // Internal fns

    /**
     * @notice Add a new employee to Payroll
     * @param _accountAddress Employee's address to receive payroll
     * @param _initialDenominationSalary Employee's salary, per second in denomination token
     * @param _role Employee's role
     * @param _startDate Employee's starting timestamp in seconds
     */
    function _addEmployee(address _accountAddress, uint256 _initialDenominationSalary, string _role, uint64 _startDate) internal {
        // Check address is non-null
        require(_accountAddress != address(0), ERROR_EMPLOYEE_NULL_ADDRESS);
        // Check address isn't already being used
        require(!_employeeExists(_accountAddress), ERROR_EMPLOYEE_ALREADY_EXIST);

        uint256 employeeId = nextEmployee++;
        Employee storage employee = employees[employeeId];
        employee.accountAddress = _accountAddress;
        employee.denominationTokenSalary = _initialDenominationSalary;
        employee.lastPayroll = _startDate;
        employee.endDate = MAX_UINT64;

        // Create IDs mapping
        employeeIds[_accountAddress] = employeeId;

        emit AddEmployee(employeeId, _accountAddress, _initialDenominationSalary, _role, _startDate);
    }

    /**
     * @dev Add a requested amount to the bonus amount for a given employee
     * @param _employeeId Employee's identifier
     * @param _amount Amount be added to the employee's bonus amount
     */
    function _addBonus(uint256 _employeeId, uint256 _amount) internal {
        Employee storage employee = employees[_employeeId];
        employee.bonus = employee.bonus.add(_amount);
        emit AddEmployeeBonus(_employeeId, _amount);
    }

    /**
     * @dev Add a requested amount to the reimbursements of a given employee
     * @param _employeeId Employee's identifier
     * @param _amount Amount be added to the employee's reimbursements
     */
    function _addReimbursement(uint256 _employeeId, uint256 _amount) internal {
        Employee storage employee = employees[_employeeId];
        employee.reimbursements = employee.reimbursements.add(_amount);
        emit AddEmployeeReimbursement(_employeeId, _amount);
    }

    /**
     * @dev Add a requested amount to the accrued salary for a given employee
     * @param _employeeId Employee's identifier
     * @param _amount Amount be added to the employee's accrued salary
     */
    function _addAccruedSalary(uint256 _employeeId, uint256 _amount) internal {
        Employee storage employee = employees[_employeeId];
        employee.accruedSalary = employee.accruedSalary.add(_amount);
        emit AddEmployeeAccruedSalary(_employeeId, _amount);
    }

    /**
     * @dev Set the price feed address used for exchange rates
     * @param _feed Address of the new price feed instance
     */
    function _setPriceFeed(IFeed _feed) internal {
        require(isContract(_feed), ERROR_FEED_NOT_CONTRACT);
        feed = _feed;
        emit SetPriceFeed(feed);
    }

    /**
     * @dev Set the exchange rate expiry time in seconds. Exchange rates older than it won't be accepted when making payments
     * @param _time The expiration time in seconds for exchange rates
     */
    function _setRateExpiryTime(uint64 _time) internal {
        // Require a sane minimum for the rate expiry time
        // (1 min == ~4 block window to mine both a pricefeed update and a payout)
        require(_time > 1 minutes, ERROR_EXPIRY_TIME_TOO_SHORT);
        rateExpiryTime = _time;
        emit SetRateExpiryTime(rateExpiryTime);
    }

    /**
     * @dev Set the end date of an employee
     * @param _employeeId Employee's identifier to set the end date of
     * @param _endDate Date timestamp in seconds to be set as the end date of the employee
     */
    function _terminateEmployeeAt(uint256 _employeeId, uint64 _endDate) internal {
        // Prevent past termination dates
        require(_endDate >= getTimestamp64(), ERROR_PAST_TERMINATION_DATE);

        Employee storage employee = employees[_employeeId];
        employee.endDate = _endDate;

        emit TerminateEmployee(_employeeId, employee.accountAddress, _endDate);
    }

    /**
     * @dev Calculate the new last payroll date for an employee based on an requested payment amount
     * @param _employeeId Employee's identifier
     * @param _payedAmount Amount payed to the employee
     * @return The new last payroll timestamp in seconds based on the requested payment amount
     */
    function _getLastPayroll(uint256 _employeeId, uint256 _payedAmount) internal view returns (uint64) {
        Employee storage employee = employees[_employeeId];

        uint256 timeDiff = _payedAmount.div(employee.denominationTokenSalary);

        // We check if the division was perfect, and if not, take its ceiling to avoid giving away tiny amounts of salary.
        // As an employee, you may lose up to a second's worth of payroll if you use the "request partial amount" feature.

        if (timeDiff.mul(employee.denominationTokenSalary) != _payedAmount) {
            timeDiff = timeDiff.add(1);
        }

        // This function is only called from _payday, where we make sure that _payedAmount is lower than or equal to the
        // total owed amount, that is obtained from _getCurrentCappedOwedSalary, which does exactly the opposite calculation:
        // multiplying the employee's salary by an uint64 number of seconds. Therefore, timeDiff will always fit in 64.
        // Nevertheless, we are performing a sanity check at the end to ensure the computed last payroll timestamp
        // is not greater than the current timestamp.

        uint64 lastPayrollDate = employee.lastPayroll.add(uint64(timeDiff));
        require(lastPayrollDate <= getTimestamp64(), ERROR_LAST_PAYROLL_DATE_TOO_BIG);
        return lastPayrollDate;
    }

    /**
     * @dev Get amount of owed salary for a given employee since their last payroll. It reverts in case of an overflow.
     * @param _employeeId Employee's identifier
     * @return Total amount of owed salary for the requested employee since their last payroll. It reverts in case of an overflow.
     */
    function _getCurrentOwedSalary(uint256 _employeeId) internal view returns (uint256) {
        uint256 timeDiff = _getOwedPayrollPeriod(_employeeId);
        if (timeDiff == 0) return 0;
        return employees[_employeeId].denominationTokenSalary.mul(timeDiff);
    }

    /**
     * @dev Get amount of owed salary for a given employee since their last payroll capped by max uint
     * @param _employeeId Employee's identifier
     * @return Total amount of owed salary for the requested employee since their last payroll capped by max uint
     */
    function _getCurrentCappedOwedSalary(uint256 _employeeId) internal view returns (uint256) {
        uint256 timeDiff = _getOwedPayrollPeriod(_employeeId);
        if (timeDiff == 0) return 0;

        Employee storage employee = employees[_employeeId];
        uint256 salary = employee.denominationTokenSalary;
        uint256 result = salary * timeDiff;

        // Return max uint if the result overflows
        return (result / timeDiff != salary) ? MAX_UINT256 : result;
    }

    /**
     * @dev Get previous and current amounts of owed salaries for a given employee since their last payroll
     * @param _employeeId Employee's identifier
     * @return Total amounts of previous and current owed salaries for the requested employee since their last payroll
     */
    function _getOwedSalaries(uint256 _employeeId) internal view returns (uint256 currentOwedSalary, uint256 totalOwedSalary) {
        currentOwedSalary = _getCurrentCappedOwedSalary(_employeeId);
        totalOwedSalary = currentOwedSalary + employees[_employeeId].accruedSalary;

        if (totalOwedSalary < currentOwedSalary) {
            // Return max uint if previous addition overflowed
            totalOwedSalary = MAX_UINT256;
        }
    }

    /**
     * @dev Get owed payroll period in seconds for a given employee
     * @param _employeeId Employee's identifier
     * @return Number of seconds amounts representing the owed payroll period for the requested employee since their last payroll
     */
    function _getOwedPayrollPeriod(uint256 _employeeId) internal view returns (uint256) {
        Employee storage employee = employees[_employeeId];

        // Get the min of current date and termination date
        uint64 date = _isEmployeeActive(_employeeId) ? getTimestamp64() : employee.endDate;

        // Make sure we don't revert if we try to get the owed salary for an employee whose start date
        // is in the future (necessary in case we need to change their salary before their start date)
        if (date <= employee.lastPayroll) return 0;

        // Get time diff in seconds, no need to use safe math as the underflow was covered by the previous check
        return uint256(date - employee.lastPayroll);
    }

    /**
     * @dev Get token exchange rate for a token based on the denomination token
     * @param _token Token
     * @return ONE if _token is denominationToken or 0 if the exchange rate isn't recent enough
     */
    function _getExchangeRate(address _token) internal view returns (uint128) {
        // Denomination token has always exchange rate of 1
        if (_token == denominationToken) {
            return ONE;
        }

        (uint128 xrt, uint64 when) = feed.get(_token, denominationToken);

        // Check the price feed is recent enough
        if (getTimestamp64().sub(when) >= rateExpiryTime) {
            return 0;
        }

        return xrt;
    }

    /**
     * @dev Loop over tokens to send requested amount to the employee
     * @param _employeeId Employee's identifier
     * @param _totalAmount Total amount to be transferred to the employee distributed in accordance to the employee's token allocation
     * @param _type Payment type to be performed
     * @return True if there was at least one token transfer
     */
    function _transferTokensAmount(uint256 _employeeId, PaymentType _type, uint256 _totalAmount) internal returns (bool somethingPaid) {
        if (_totalAmount == 0) return false;
        Employee storage employee = employees[_employeeId];
        string memory paymentReference = _paymentReferenceFor(_type);
        for (uint256 i = 0; i < allowedTokensArray.length; i++) {
            address token = allowedTokensArray[i];
            if (employee.allocation[token] != uint256(0)) {
                uint128 exchangeRate = _getExchangeRate(token);
                require(exchangeRate > 0, ERROR_EXCHANGE_RATE_ZERO);
                // Salary converted to token and applied allocation percentage
                uint256 tokenAmount = _totalAmount.mul(exchangeRate).mul(employee.allocation[token]);
                // Divide by 100 for the allocation and by ONE for the exchange rate
                tokenAmount = tokenAmount / (100 * ONE);
                address employeeAddress = employee.accountAddress;
                finance.newImmediatePayment(token, employeeAddress, tokenAmount, paymentReference);
                emit SendPayment(employeeAddress, token, tokenAmount, paymentReference);
                somethingPaid = true;
            }
        }
    }

    /**
     * @dev Try removing employee if there are no pending payments and has reached employee's end date
     * @param _employeeId Employee's identifier
     */
    function _removeEmployeeIfTerminatedAndPaidOut(uint256 _employeeId) internal {
        Employee storage employee = employees[_employeeId];

        if (employee.endDate > getTimestamp64()) {
            return;
        }
        if (_getCurrentCappedOwedSalary(_employeeId) > 0) {
            return;
        }
        if (employee.reimbursements > 0 || employee.accruedSalary > 0 || employee.bonus > 0) {
            return;
        }

        delete employeeIds[employee.accountAddress];
        delete employees[_employeeId];
    }

    /**
     * @dev Tell whether an employee is registered in this Payroll or not
     * @param _accountAddress Address of the employee to query the existence of
     * @return True if the given address belongs to a registered employee, false otherwise
     */
    function _employeeExists(address _accountAddress) internal view returns (bool) {
        return employeeIds[_accountAddress] != uint256(0);
    }

    /**
     * @dev Tell whether an employee is registered in this Payroll or not
     * @param _employeeId Employee's identifier
     * @return True if the employee is registered in this Payroll, false otherwise
     */
    function _employeeExists(uint256 _employeeId) internal view returns (bool) {
        Employee storage employee = employees[_employeeId];
        return employee.accountAddress != address(0);
    }

    /**
     * @dev Tell whether an employee is still active or not
     * @param _employeeId Employee's identifier
     * @return True if the employee's end date has not been reached yet, false otherwise
     */
    function _isEmployeeActive(uint256 _employeeId) internal view returns (bool) {
        Employee storage employee = employees[_employeeId];
        return employee.endDate >= getTimestamp64();
    }

    /**
     * @dev Updates the accrued salary and payroll date of a given employee based on a paying amount and their current owed salary
     * @param _employeeId Employee's identifier
     * @param _paymentAmount Amount being payed to the employee
     * @param _currentOwedSalary Amount owed to the employee for his current salary
     */
    function _updateEmployeeStatusBasedOnPaidPayroll(uint256 _employeeId, uint256 _paymentAmount, uint256 _currentOwedSalary) private {
        Employee storage employee = employees[_employeeId];
        uint256 accruedSalary = employee.accruedSalary;

        if (_paymentAmount <= accruedSalary) {
            // employee is only cashing out some previous owed salary, then we don't need to update the last payroll date
            // there's no need to use SafeMath here since we already know that accruedSalary is >= than _paymentAmount
            employee.accruedSalary = accruedSalary - _paymentAmount;
        } else if (accruedSalary > 0) {
            // employee is cashing out a mixed amount between previous and current owed salaries,
            // then we need to set the accrued salary to zero and update the last payroll date
            // there's no need to use safemath here since we already know that _paymentAmount is > accruedSalary
            employee.accruedSalary = uint256(0);
            uint256 remainder = _paymentAmount - accruedSalary;
            employee.lastPayroll = (remainder == _currentOwedSalary) ? getTimestamp64() : _getLastPayroll(_employeeId, remainder);
        } else {
            // employee is only cashing out some current owed salary, and there is no previous owed salary,
            // then we only need to update the last payroll date
            employee.lastPayroll = (_paymentAmount == _currentOwedSalary) ? getTimestamp64() : _getLastPayroll(_employeeId, _paymentAmount);
        }
    }

    /**
     * @dev Get payment reference for a given payment type
     * @param _type Payment type to query the reference of
     * @return Payment reference for the given payment type
     */
    function _paymentReferenceFor(PaymentType _type) internal pure returns (string memory) {
        if (_type == PaymentType.Payroll) return "Payroll";
        if (_type == PaymentType.Reimbursement) return "Reimbursement";
        if (_type == PaymentType.Bonus) return "Bonus";
        revert(ERROR_INVALID_PAYMENT_TYPE);
    }

    function _ensurePaymentAmount(uint256 _owedAmount, uint256 _requestedAmount) private pure returns (uint256) {
        require(_owedAmount > 0, ERROR_NOTHING_PAID);
        require(_owedAmount >= _requestedAmount, ERROR_INVALID_REQUESTED_AMOUNT);
        return _requestedAmount > 0 ? _requestedAmount : _owedAmount;
    }
}
