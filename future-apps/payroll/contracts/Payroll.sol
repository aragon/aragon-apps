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
    using SafeMath8 for uint8;

    bytes32 constant public ADD_EMPLOYEE_ROLE = keccak256("ADD_EMPLOYEE_ROLE");
    bytes32 constant public TERMINATE_EMPLOYEE_ROLE = keccak256("TERMINATE_EMPLOYEE_ROLE");
    bytes32 constant public SET_EMPLOYEE_SALARY_ROLE = keccak256("SET_EMPLOYEE_SALARY_ROLE");
    bytes32 constant public ADD_ACCRUED_VALUE_ROLE = keccak256("ADD_ACCRUED_VALUE_ROLE");
    bytes32 constant public ALLOWED_TOKENS_MANAGER_ROLE = keccak256("ALLOWED_TOKENS_MANAGER_ROLE");
    bytes32 constant public CHANGE_PRICE_FEED_ROLE = keccak256("CHANGE_PRICE_FEED_ROLE");
    bytes32 constant public MODIFY_RATE_EXPIRY_ROLE = keccak256("MODIFY_RATE_EXPIRY_ROLE");

    uint128 internal constant ONE = 10 ** 18; // 10^18 is considered 1 in the price feed to allow for decimal calculations
    uint256 internal constant MAX_UINT256 = uint256(-1);
    uint64 internal constant MAX_UINT64 = uint64(-1);
    uint8 internal constant MAX_ALLOWED_TOKENS = 20; // for loop in `payday()` uses ~260k gas per available token
    uint256 internal constant MAX_ACCRUED_VALUE = 2**128;

    string private constant ERROR_NON_ACTIVE_EMPLOYEE = "PAYROLL_NON_ACTIVE_EMPLOYEE";
    string private constant ERROR_EMPLOYEE_DOES_NOT_MATCH = "PAYROLL_EMPLOYEE_DOES_NOT_MATCH";
    string private constant ERROR_FINANCE_NOT_CONTRACT = "PAYROLL_FINANCE_NOT_CONTRACT";
    string private constant ERROR_TOKEN_ALREADY_ALLOWED = "PAYROLL_TOKEN_ALREADY_ALLOWED";
    string private constant ERROR_MAX_ALLOWED_TOKENS = "PAYROLL_MAX_ALLOWED_TOKENS";
    string private constant ERROR_ACCRUED_VALUE_TOO_BIG = "PAYROLL_ACCRUED_VALUE_TOO_BIG";
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

    struct Employee {
        address accountAddress; // unique, but can be changed over time
        mapping(address => uint8) allocation;
        uint256 denominationTokenSalary; // per second in denomination Token
        uint256 accruedValue;
        uint64 lastPayroll;
        uint64 endDate;
    }

    Finance public finance;
    address public denominationToken;
    IFeed public feed;
    uint64 public rateExpiryTime;

    mapping(uint256 => Employee) private employees;     // employee ID -> employee
    // Employees start at index 1, to allow us to use employees[0] to check for non-existent address
    // mappings with employeeIds
    uint256 public nextEmployee;
    mapping(address => uint256) private employeeIds;    // employee address -> employee ID
    mapping(address => bool) private allowedTokens;
    address[] internal allowedTokensArray;

    event AddAllowedToken(address token);
    event AddEmployee(
        uint256 indexed employeeId,
        address indexed accountAddress,
        uint256 initialDenominationSalary,
        string name,
        string role,
        uint64 startDate
    );
    event SetEmployeeSalary(uint256 indexed employeeId, uint256 denominationSalary);
    event AddEmployeeAccruedValue(uint256 indexed employeeId, uint256 amount);
    event TerminateEmployee(uint256 indexed employeeId, address indexed accountAddress, uint64 endDate);
    event ChangeAddressByEmployee(uint256 indexed employeeId, address indexed oldAddress, address indexed newAddress);
    event DetermineAllocation(uint256 indexed employeeId, address indexed employee);
    event SendPayroll(address indexed employee, address indexed token, uint amount);
    event SetPriceFeed(address indexed feed);
    event SetRateExpiryTime(uint64 time);

    modifier employeeActive(uint256 employeeId) {
        Employee storage employee = employees[employeeId];
        // Check employee exists and is active
        require(employeeIds[employee.accountAddress] != 0 && employee.endDate > getTimestamp64(), ERROR_NON_ACTIVE_EMPLOYEE);
        _;
    }

    modifier employeeMatches {
        // Check employee exists (and matches sender)
        require(employees[employeeIds[msg.sender]].accountAddress == msg.sender, ERROR_EMPLOYEE_DOES_NOT_MATCH);
        _;
    }

    /**
     * @notice Initialize Payroll app for Finance at `_finance` and price feed at `priceFeed`, setting denomination token to `_token.symbol(): string` and exchange rate expiry time to `@transformTime(_rateExpiryTime)`.
     * @param _finance Address of the Finance app this Payroll will rely on (non-changeable)
     * @param _denominationToken Address of the denomination token
     * @param _priceFeed Address of the price feed
     * @param _rateExpiryTime Exchange rate expiry time, in seconds
     */
    function initialize(
        Finance _finance,
        address _denominationToken,
        IFeed _priceFeed,
        uint64 _rateExpiryTime
    )
        external
        onlyInit
    {
        require(isContract(_finance), ERROR_FINANCE_NOT_CONTRACT);

        initialized();

        // Reserve the first employee index as an unused index to check null address mappings
        nextEmployee = 1;
        finance = _finance;
        denominationToken = _denominationToken;
        _setPriceFeed(_priceFeed);
        _setRateExpiryTime(_rateExpiryTime);
    }

    /**
     * @notice Sets the price feed for exchange rates to `_feed`.
     * @param _feed Address of the price feed
     */
    function setPriceFeed(IFeed _feed) external authP(CHANGE_PRICE_FEED_ROLE, arr(_feed, feed)) {
        _setPriceFeed(_feed);
    }

    /**
     * @dev Set the exchange rate expiry time, in seconds. Exchange rates older than it won't be accepted for payments.
     * @notice Sets the exchange rate expiry time to `@transformTime(_time)`.
     * @param _time The expiration time in seconds for exchange rates
     */
    function setRateExpiryTime(uint64 _time)
        external
        authP(MODIFY_RATE_EXPIRY_ROLE, arr(uint256(_time), uint256(rateExpiryTime)))
    {
        _setRateExpiryTime(_time);
    }

    /**
     * @notice Add `_allowedToken` to the set of allowed tokens
     * @param _allowedToken New token allowed for payment
     */
    function addAllowedToken(address _allowedToken) external authP(ALLOWED_TOKENS_MANAGER_ROLE, arr(_allowedToken)) {
        require(!allowedTokens[_allowedToken], ERROR_TOKEN_ALREADY_ALLOWED);
        require(allowedTokensArray.length < MAX_ALLOWED_TOKENS, ERROR_MAX_ALLOWED_TOKENS);
        allowedTokens[_allowedToken] = true;
        allowedTokensArray.push(_allowedToken);

        emit AddAllowedToken(_allowedToken);
    }

    /*
     * TODO: removeFromAllowedTokens. It wouldn't be trivial, as employees
     * should modifiy their allocation. They should be notified and their
     * last allocation date should be reset.
     */

    /**
     * @notice Add employee `_name` with address `_accountAddress` to Payroll with a salary of `_initialDenominationSalary` per second.
     * @param _accountAddress Employee's address to receive payroll
     * @param _initialDenominationSalary Employee's salary, per second in denomination token
     * @param _name Employee's name
     * @param _role Employee's role
     */
    function addEmployee(
        address _accountAddress,
        uint256 _initialDenominationSalary,
        string _name,
        string _role
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(_accountAddress, _initialDenominationSalary, getTimestamp64()))
    {
        _addEmployee(
            _accountAddress,
            _initialDenominationSalary,
            _name,
            _role,
            getTimestamp64()
        );
    }

    /**
     * @notice Add employee `_name` with address `_accountAddress` to Payroll with a salary of `_initialDenominationSalary` per second, starting on `_startDate`.
     * @param _accountAddress Employee's address to receive payroll
     * @param _initialDenominationSalary Employee's salary, per second in denomination token
     * @param _name Employee's name
     * @param _role Employee's role
     * @param _startDate Employee's starting date (it actually sets their initial lastPayroll value)
     */
    function addEmployee(
        address _accountAddress,
        uint256 _initialDenominationSalary,
        string _name,
        string _role,
        uint64 _startDate
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(_accountAddress, _initialDenominationSalary, _startDate))
    {
        _addEmployee(
            _accountAddress,
            _initialDenominationSalary,
            _name,
            _role,
            _startDate
        );
    }

    /**
     * @notice Set employee #`_employeeId`'s annual salary to `_denominationSalary` per second.
     * @param _employeeId Employee's identifier
     * @param _denominationSalary Employee's new salary, per second in denomination token
     */
    function setEmployeeSalary(
        uint256 _employeeId,
        uint256 _denominationSalary
    )
        external
        employeeActive(_employeeId)
        authP(SET_EMPLOYEE_SALARY_ROLE, arr(_employeeId, _denominationSalary))
    {
        uint64 timestamp = getTimestamp64();

        // Add owed salary to employee's accrued value
        uint256 owed = _getOwedSalary(_employeeId, timestamp);
        _addAccruedValue(_employeeId, owed);

        // Update employee to track the new salary and payment date
        Employee storage employee = employees[_employeeId];
        employee.lastPayroll = timestamp;
        employee.denominationTokenSalary = _denominationSalary;

        emit SetEmployeeSalary(_employeeId, _denominationSalary);
    }

    /**
     * @notice Terminate employee #`_employeeId`
     * @param _employeeId Employee's identifier
     */
    function terminateEmployeeNow(
        uint256 _employeeId
    )
        external
        employeeActive(_employeeId)
        authP(TERMINATE_EMPLOYEE_ROLE, arr(_employeeId))
    {
        _terminateEmployee(_employeeId, getTimestamp64());
    }

    /**
     * @notice Terminate employee #`_employeeId` on `@formatDate(_endDate)`
     * @param _employeeId Employee's identifier
     * @param _endDate Termination date
     */
    function terminateEmployee(
        uint256 _employeeId,
        uint64 _endDate
    )
        external
        employeeActive(_employeeId)
        authP(TERMINATE_EMPLOYEE_ROLE, arr(_employeeId))
    {
        _terminateEmployee(_employeeId, _endDate);
    }

    /**
     * @notice Adds `_amount` to accrued value for employee #`_employeeId`
     * @param _employeeId Employee's identifier
     * @param _amount Amount to add
     */
    function addAccruedValue(
        uint256 _employeeId,
        uint256 _amount
    )
        external
        employeeActive(_employeeId)
        authP(ADD_ACCRUED_VALUE_ROLE, arr(_employeeId, _amount))
    {
        _addAccruedValue(_employeeId, _amount);
    }

    /**
     * @notice Set token distribution for payments to an employee (the caller).
     * @dev Initialization check is implicitly provided by `employeeMatches()` as new employees can
     *      only be added via `addEmployee(),` which requires initialization.
     * @param _tokens Array with the tokens to receive, they must belong to allowed tokens for employee
     * @param _distribution Array (correlated to tokens) with the proportions (integers summing to 100)
     */
    function determineAllocation(address[] _tokens, uint8[] _distribution) external employeeMatches {
        // Check arrays match
        require(_tokens.length == _distribution.length, ERROR_TOKEN_ALLOCATION_MISMATCH);

        Employee storage employee = employees[employeeIds[msg.sender]];


        // Delete previous allocation
        for (uint32 j = 0; j < allowedTokensArray.length; j++) {
            delete employee.allocation[allowedTokensArray[j]];
        }

        // Check distribution sums to 100
        uint8 sum = 0;
        for (uint32 i = 0; i < _distribution.length; i++) {
            // Check token is allowed
            require(allowedTokens[_tokens[i]], ERROR_NO_ALLOWED_TOKEN);
            // Set distribution
            employee.allocation[_tokens[i]] = _distribution[i];
            sum = sum.add(_distribution[i]);
        }
        require(sum == 100, ERROR_DISTRIBUTION_NO_COMPLETE);

        emit DetermineAllocation(employeeIds[msg.sender], msg.sender);
    }

    /**
     * @dev Withdraw payment by employee (the caller). The amount owed since last call will be transferred.
     *      Initialization check is implicitly provided by `employeeMatches()` as new employees can
     *      only be added via `addEmployee(),` which requires initialization.
     * @notice Withdraw your own payroll.
     * @param _amount Amount of owed salary requested. Must be less or equal than total owed so far.
     */
    function partialPayday(uint256 _amount) external employeeMatches {
        bool somethingPaid = _payTokens(employeeIds[msg.sender], _amount);
        require(somethingPaid, ERROR_NOTHING_PAID);
    }

    /**
     * @dev Withdraw payment by employee (the caller). The amount owed since last call will be transferred.
     *      Initialization check is implicitly provided by `employeeMatches()` as new employees can
     *      only be added via `addEmployee(),` which requires initialization.
     * @notice Withdraw your own payroll.
     */
    function payday() external employeeMatches {
        bool somethingPaid = _payTokens(employeeIds[msg.sender], 0);
        require(somethingPaid, ERROR_NOTHING_PAID);
    }

    /**
     * @dev Change employee's account address. Must be called by employee from their registered address.
     *      Initialization check is implicitly provided by `employeeMatches()` as new employees can
     *      only be added via `addEmployee(),` which requires initialization.
     * @notice Change your employee account address to `_newAddress`
     * @param _newAddress New address to receive payments
     */
    function changeAddressByEmployee(address _newAddress) external employeeMatches {
        // Check address is non-null
        require(_newAddress != address(0), ERROR_EMPLOYEE_NULL_ADDRESS);
        // Check address isn't already being used
        require(employeeIds[_newAddress] == 0, ERROR_EMPLOYEE_ALREADY_EXIST);

        uint256 employeeId = employeeIds[msg.sender];
        Employee storage employee = employees[employeeId];
        address oldAddress = employee.accountAddress;

        employee.accountAddress = _newAddress;
        employeeIds[_newAddress] = employeeId;
        delete employeeIds[msg.sender];

        emit ChangeAddressByEmployee(employeeId, oldAddress, _newAddress);
    }

    function isForwarder() external pure returns (bool) {
        return true;
    }

    // Getter fns

    /**
     * @dev Return all information for employee by their address
     * @param _accountAddress Employee's address to receive payments
     * @return Employee's identifier
     * @return Employee's annual salary, per second in denomination token
     * @return Employee's accrued value
     * @return Employee's last payment date
     * @return Employee's termination date (max uint64 if none)
     */
    function getEmployeeByAddress(address _accountAddress)
        public
        view
        returns (
            uint256 employeeId,
            uint256 denominationSalary,
            uint256 accruedValue,
            uint64 lastPayroll,
            uint64 endDate
        )
    {
        employeeId = employeeIds[_accountAddress];

        Employee storage employee = employees[employeeId];

        denominationSalary = employee.denominationTokenSalary;
        accruedValue = employee.accruedValue;
        lastPayroll = employee.lastPayroll;
        endDate = employee.endDate;
    }

    /**
     * @dev Return all information for employee by their ID
     * @param _employeeId Employee's identifier
     * @return Employee's address to receive payments
     * @return Employee's annual salary, per second in denomination token
     * @return Employee's accrued value
     * @return Employee's last payment date
     * @return Employee's termination date (max uint64 if none)
     */
    function getEmployee(uint256 _employeeId)
        public
        view
        returns (
            address accountAddress,
            uint256 denominationSalary,
            uint256 accruedValue,
            uint64 lastPayroll,
            uint64 endDate
        )
    {
        Employee storage employee = employees[_employeeId];

        accountAddress = employee.accountAddress;
        denominationSalary = employee.denominationTokenSalary;
        accruedValue = employee.accruedValue;
        lastPayroll = employee.lastPayroll;
        endDate = employee.endDate;
    }

    /**
     * @notice Get payment proportion for an employee and a token
     * @param _employeeId Employee's identifier
     * @param _token Payment token
     * @return Employee's payment allocation for token
     */
    function getAllocation(uint256 _employeeId, address _token) public view returns (uint8 allocation) {
        return employees[_employeeId].allocation[_token];
    }

    /**
     * @dev Check if a token is allowed to be used in this app
     * @param _token Token to check
     * @return True if it's in the list of allowed tokens, false otherwise
     */
    function isTokenAllowed(address _token) public view returns (bool) {
        return allowedTokens[_token];
    }

    /**
     * @dev IForwarder interface conformance. Forwards any employee action.
     * @param _evmScript script being executed
     */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript), ERROR_NO_FORWARD);
        bytes memory input = new bytes(0); // TODO: Consider input for this
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(finance);
        runScript(_evmScript, input, blacklist);
    }

    function canForward(address _sender, bytes) public view returns (bool) {
        // Check employee exists (and matches)
        return (employees[employeeIds[_sender]].accountAddress == _sender);
    }

    // Internal fns

    function _addEmployee(
        address _accountAddress,
        uint256 _initialDenominationSalary,
        string _name,
        string _role,
        uint64 _startDate
    )
        internal
    {
        // Check address isn't already being used
        require(employeeIds[_accountAddress] == 0, ERROR_EMPLOYEE_ALREADY_EXIST);

        uint256 employeeId = nextEmployee++;

        Employee storage employee = employees[employeeId];
        employee.accountAddress = _accountAddress;
        employee.denominationTokenSalary = _initialDenominationSalary;
        employee.lastPayroll = _startDate;
        employee.endDate = MAX_UINT64;

        // Create IDs mapping
        employeeIds[_accountAddress] = employeeId;

        emit AddEmployee(
            employeeId,
            _accountAddress,
            _initialDenominationSalary,
            _name,
            _role,
            _startDate
        );
    }

    function _addAccruedValue(uint256 _employeeId, uint256 _amount) internal {
        employees[_employeeId].accruedValue = employees[_employeeId].accruedValue.add(_amount);

        emit AddEmployeeAccruedValue(_employeeId, _amount);
    }

    function _setPriceFeed(IFeed _feed) internal {
        require(isContract(_feed), ERROR_FEED_NOT_CONTRACT);
        feed = _feed;
        emit SetPriceFeed(feed);
    }

    function _setRateExpiryTime(uint64 _time) internal {
        // Require a sane minimum for the rate expiry time
        // (1 min == ~4 block window to mine both a pricefeed update and a payout)
        require(_time > 1 minutes, ERROR_EXPIRY_TIME_TOO_SHORT);
        rateExpiryTime = _time;
        emit SetRateExpiryTime(rateExpiryTime);
    }

    /**
     * @dev Loop over tokens and send Payroll to employee
     * @param _employeeId Employee's identifier
     * @param _amount Amount of owed salary requested. Must be less or equal than total owed so far.
     * @return True if something has been paid
     */
    function _payTokens(uint256 _employeeId, uint256 _amount) internal returns (bool somethingPaid) {
        Employee storage employee = employees[_employeeId];

        // Get the min of current date and termination date
        uint64 timestamp = getTimestamp64();
        uint64 toDate;
        if (employee.endDate < timestamp) {
            toDate = employee.endDate;
        } else {
            toDate = timestamp;
        }

        // Compute owed amount, set to max int in case of overflow
        uint256 owed = employee.accruedValue + _getOwedSalary(_employeeId, toDate);
        if (owed < employee.accruedValue) {
            owed = MAX_UINT256;
        }
        if (owed == 0 || owed < _amount) {
            return false;
        }

        // Update last payroll date and accrued value first thing (to avoid re-entrancy)
        employee.lastPayroll = timestamp;
        uint256 toPay;
        if (_amount > 0 && owed > _amount) {
            // no need for safemath as here we know owed >= _amount
            employee.accruedValue = owed - _amount;
            toPay = _amount;
        } else {
            employee.accruedValue = 0;
            toPay = owed;
        }

        // Loop over allowed tokens
        for (uint32 i = 0; i < allowedTokensArray.length; i++) {
            address token = allowedTokensArray[i];
            if (employee.allocation[token] == 0) {
                continue;
            }
            uint128 exchangeRate = _getExchangeRate(token);
            require(exchangeRate > 0, ERROR_EXCHANGE_RATE_ZERO);
            // Salary converted to token and applied allocation percentage
            uint256 tokenAmount = toPay.mul(exchangeRate).mul(employee.allocation[token]);
            // Divide by 100 for the allocation and by ONE for the exchange rate
            tokenAmount = tokenAmount / (100 * ONE);
            finance.newPayment(
                token,
                employee.accountAddress,
                tokenAmount,
                0,
                0,
                1,
                "Payroll"
            );
            emit SendPayroll(employee.accountAddress, token, tokenAmount);
            somethingPaid = true;
        }

        // Try to remove employee
        if (employee.endDate <= timestamp && employee.accruedValue == 0) {
            delete employeeIds[employee.accountAddress];
            delete employees[_employeeId];
        }
    }

    function _terminateEmployee(uint256 _employeeId, uint64 _endDate) internal {
        // Prevent past termination dates
        require(_endDate >= getTimestamp64(), ERROR_PAST_TERMINATION_DATE);

        Employee storage employee = employees[_employeeId];
        employee.endDate = _endDate;

        emit TerminateEmployee(_employeeId, employee.accountAddress, _endDate);
    }

    function _getOwedSalary(uint256 _employeeId, uint64 _date) internal view returns (uint256) {
        Employee storage employee = employees[_employeeId];

        // Make sure we don't revert if we try to get the owed salary for an employee whose start
        // date is in the future (necessary in case we need to change their salary before their
        // start date)
        if (_date <= employee.lastPayroll) {
            return 0;
        }

        // Get time that has gone by (seconds)
        // No need to use safe math as the underflow was covered by the previous check
        uint64 time = _date - employee.lastPayroll;

        // if the result would overflow, set it to max int
        uint256 result = employee.denominationTokenSalary * time;
        if (result / time != employee.denominationTokenSalary) {
            return MAX_UINT256;
        }

        return result;
    }

    /**
     * @dev Gets token exchange rate for a token based on the denomination token.
     * @param _token Token
     * @return ONE if _token is denominationToken or 0 if the exchange rate isn't recent enough
     */
    function _getExchangeRate(address _token) internal view returns (uint128) {
        uint128 xrt;
        uint64 when;

        // Denomination token has always exchange rate of 1
        if (_token == denominationToken) {
            return ONE;
        }

        (xrt, when) = feed.get(denominationToken, _token);

        // Check the price feed is recent enough
        if (getTimestamp64().sub(when) >= rateExpiryTime) {
            return 0;
        }

        return xrt;
    }
}
