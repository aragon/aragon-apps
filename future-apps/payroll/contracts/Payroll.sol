pragma solidity 0.4.24;

import "@aragon/os/contracts/apps/AragonApp.sol";
// import "@aragon/os/contracts/common/IForwarder.sol";

import "@aragon/os/contracts/lib/token/ERC20.sol";
import "@aragon/os/contracts/lib/math/SafeMath.sol";
import "@aragon/os/contracts/lib/math/SafeMath64.sol";
import "@aragon/os/contracts/lib/math/SafeMath8.sol";

import "@aragon/ppf-contracts/contracts/IFeed.sol";

import "@aragon/apps-finance/contracts/Finance.sol";


/**
 * @title Payroll in multiple currencies
 */
contract Payroll is AragonApp { //, IForwarder { // makes coverage crash (removes pure and interface doesnt match)
    using SafeMath for uint256;
    using SafeMath64 for uint64;
    using SafeMath8 for uint8;

    // kernel roles
    bytes32 constant public ADD_EMPLOYEE_ROLE = keccak256("ADD_EMPLOYEE_ROLE");
    bytes32 constant public TERMINATE_EMPLOYEE_ROLE = keccak256("TERMINATE_EMPLOYEE_ROLE");
    bytes32 constant public SET_EMPLOYEE_SALARY_ROLE = keccak256("SET_EMPLOYEE_SALARY_ROLE");
    bytes32 constant public ADD_ACCRUED_VALUE_ROLE = keccak256("ADD_ACCRUED_VALUE_ROLE");
    bytes32 constant public ALLOWED_TOKENS_MANAGER_ROLE = keccak256("ALLOWED_TOKENS_MANAGER_ROLE");
    bytes32 constant public CHANGE_PRICE_FEED_ROLE = keccak256("CHANGE_PRICE_FEED_ROLE");
    bytes32 constant public MODIFY_RATE_EXPIRY_ROLE = keccak256("MODIFY_RATE_EXPIRY_ROLE");

    address constant public ETH = address(0);
    uint128 constant public ONE = 10 ** 18; // 10^18 is considered 1 in the price feed to allow for decimal calculations
    uint64 constant public MAX_UINT64 = uint64(-1);
    uint256 constant public MAX_ACCRUED_VALUE = 2**128;

    struct Employee {
        address accountAddress; // unique, but can be changed over time
        mapping(address => uint8) allocation;
        uint256 denominationTokenSalary; // per second in denomination Token
        uint256 accruedValue;
        uint64 lastPayroll;
        uint64 endDate;
        bool terminated;
        string name;
    }

    uint128 public nextEmployee; // starts at 1
    mapping(uint128 => Employee) private employees;
    mapping(address => uint128) private employeeIds;

    Finance public finance;
    address public denominationToken;
    IFeed public feed;
    uint64 public rateExpiryTime;
    mapping(address => bool) private allowedTokens;
    address[] private allowedTokensArray;

    event AddAllowedToken(address token);
    event AddEmployee(
        uint128 indexed employeeId,
        address indexed accountAddress,
        uint256 initialDenominationSalary,
        string name,
        uint64 startDate
    );
    event SetEmployeeSalary(uint128 indexed employeeId, uint256 denominationSalary);
    event AddEmployeeAccruedValue(uint128 indexed employeeId, uint256 amount);
    event TerminateEmployee(uint128 indexed employeeId, address accountAddress, uint64 endDate);
    event ChangeAddressByEmployee(uint128 indexed employeeId, address oldAddress, address newAddress);
    event DetermineAllocation(uint128 indexed employeeId, address indexed employee);
    event SendPayroll(address indexed employee, address indexed token, uint amount);
    event SetPriceFeed(address feed);
    event SetRateExpiryTime(uint64 time);

    modifier employeeExists(uint128 employeeId) {
        /* check that employee exists and is active */
        require(employeeIds[employees[employeeId].accountAddress] != 0 && !employees[employeeId].terminated);
        _;
    }

    modifier employeeMatches {
        // check that employee exists (and matches)
        require(employees[employeeIds[msg.sender]].accountAddress == msg.sender);
        _;
    }

    /**
     * @notice Initialize Payroll app for `_finance`. Set ETH and Denomination tokens
     * @param _finance Address of the finance Payroll will rely on (non changeable)
     * @param _denominationToken Address of Denomination Token
     */
    function initialize(
        Finance _finance,
        address _denominationToken,
        IFeed _priceFeed,
        uint64 _rateExpiryTime
    ) external
        onlyInit
    {
        require(address(_finance) != address(0));

        initialized();

        nextEmployee = 1; // leave 0 to check null address mapping
        finance = _finance;
        denominationToken = _denominationToken;
        _setPriceFeed(_priceFeed);
        _setRateExpiryTime(_rateExpiryTime);
    }

    /**
     * @notice Sets the Price Feed for exchange rates to `_feed`.
     * @param _feed The Price Feed address
     */
    function setPriceFeed(IFeed _feed) external authP(CHANGE_PRICE_FEED_ROLE, arr(feed, _feed)) {
        _setPriceFeed(_feed);
    }

    /**
     * @dev Set the exchange rate expiry time, in seconds. Exchange rates older than it won't be accepted for payments.
     * @notice Sets the exchange rate expiry time to `_time`.
     * @param _time The expiration time in seconds for exchange rates
     */
    function setRateExpiryTime(uint64 _time) external authP(MODIFY_RATE_EXPIRY_ROLE, arr(uint256(_time))) {
        _setRateExpiryTime(_time);
    }

    /**
     * @dev Add token to the allowed set
     * @notice Add `_allowedToken` to the set of allowed tokens
     * @param _allowedToken New token allowed for payment
     */
    function addAllowedToken(address _allowedToken) external authP(ALLOWED_TOKENS_MANAGER_ROLE, arr(_allowedToken)) {
        require(!allowedTokens[_allowedToken]);
        allowedTokens[_allowedToken] = true;
        allowedTokensArray.push(_allowedToken);

<<<<<<< HEAD
        emit AddAllowedToken(_allowedToken);
=======
        AddAllowedToken(_allowedToken);
>>>>>>> aragon-payroll
    }

    /*
     * TODO: removeFromAllowedTokens. It wouldn't be trivial, as employees
     * should modifiy their allocation. They should be notified and their
     * last allocation date should be reset.
     */

    /**
     * @dev Add employee to Payroll. See addEmployeeWithNameAndStartDate
     * @notice Add employee with address `accountAddress` to Payroll with a salary of `initialDenominationSalary` per second.
     * @param accountAddress Employee's address to receive Payroll
     * @param initialDenominationSalary Employee's salary, per second in denomination Token
     */
    function addEmployee(
        address accountAddress,
        uint256 initialDenominationSalary
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(accountAddress, initialDenominationSalary, getTimestamp64()))
    {
        _addEmployee(
            accountAddress,
            initialDenominationSalary,
            "",
            getTimestamp64()
        );
    }

    /**
     * @dev Add employee to Payroll. See addEmployeeWithNameAndStartDate
     * @notice Add employee `name` with address `accountAddress` to Payroll with a salary of `initialDenominationSalary` per second.
     * @param accountAddress Employee's address to receive Payroll
     * @param initialDenominationSalary Employee's salary, per second in denomination Token
     * @param name Employee's name
     */
    function addEmployeeWithName(
        address accountAddress,
        uint256 initialDenominationSalary,
        string name
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(accountAddress, initialDenominationSalary, getTimestamp64()))
    {
        _addEmployee(
            accountAddress,
            initialDenominationSalary,
            name,
            getTimestamp64()
        );
    }

    /**
     * @dev Add employee to Payroll
     * @notice Add employee `name` with address `accountAddress` to Payroll with a salary of `initialDenominationSalary` per second, starting on `startDate`.
     * @param accountAddress Employee's address to receive Payroll
     * @param initialDenominationSalary Employee's salary, per second in denomintation Token
     * @param name Employee's name
     * @param startDate It will actually set initial lastPayroll value
     */
    function addEmployeeWithNameAndStartDate(
        address accountAddress,
        uint256 initialDenominationSalary,
        string name,
        uint64 startDate
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(accountAddress, initialDenominationSalary, startDate))
    {
        _addEmployee(
            accountAddress,
            initialDenominationSalary,
            name,
            startDate
        );
    }

    /**
     * @dev Set employee's annual salary
     * @notice Set employee #`employeeId` annual salary to `denominationSalary` per second.
     * @param employeeId Employee's identifier
     * @param denominationSalary Employee's new salary, per second in denomintation Token
     */
    function setEmployeeSalary(
        uint128 employeeId,
        uint256 denominationSalary
    )
        employeeExists(employeeId)
        external
        authP(SET_EMPLOYEE_SALARY_ROLE, arr(uint256(employeeId), denominationSalary))
    {
        uint64 timestamp = getTimestamp64();

        // Add owed salary to employee's accrued value
        uint256 owed = _getOwedSalary(employeeId, timestamp);

        employees[employeeId].lastPayroll = timestamp;
        _addAccruedValue(employeeId, owed);

        // set new salary
        employees[employeeId].denominationTokenSalary = denominationSalary;

<<<<<<< HEAD
        emit SetEmployeeSalary(employeeId, denominationSalary);
=======
        SetEmployeeSalary(employeeId, denominationSalary);
    }

    /**
     * @dev Terminate employee from Payroll
     * @notice Terminate employee #`employeeId` from Payroll
     * @param employeeId Employee's identifier
     */
    function terminateEmployeeNow(
        uint128 employeeId
    )
        employeeExists(employeeId)
        external
        authP(TERMINATE_EMPLOYEE_ROLE, arr(uint256(employeeId)))
    {
        _terminateEmployee(employeeId, getTimestamp64());
>>>>>>> aragon-payroll
    }

    /**
     * @dev Terminate employee from Payroll
     * @notice Terminate employee #`employeeId` from Payroll
     * @param employeeId Employee's identifier
     * @param endDate Termination date
     */
<<<<<<< HEAD
    function terminateEmployeeNow(
        uint128 employeeId
=======
    function terminateEmployee(
        uint128 employeeId,
        uint64 endDate
>>>>>>> aragon-payroll
    )
        employeeExists(employeeId)
        external
        authP(TERMINATE_EMPLOYEE_ROLE, arr(uint256(employeeId)))
    {
<<<<<<< HEAD
        _terminateEmployee(employeeId, getTimestamp64());
    }

    /**
     * @dev Terminate employee from Payroll
     * @notice Terminate employee #`employeeId` from Payroll
     * @param employeeId Employee's identifier
     * @param endDate Termination date
     */
    function terminateEmployee(
        uint128 employeeId,
        uint64 endDate
    )
        employeeExists(employeeId)
        external
        authP(TERMINATE_EMPLOYEE_ROLE, arr(uint256(employeeId)))
    {
        _terminateEmployee(employeeId, endDate);
    }

    /**
     * @notice Adds `amount` to accrued value for employee with id `employeeId`
     * @param employeeId Id of the employee
     * @param amount Added amount
     */
    function addAccruedValue(
        uint128 employeeId,
        uint256 amount
    )
        employeeExists(employeeId)
        external
        authP(ADD_ACCRUED_VALUE_ROLE, arr(uint256(employeeId), amount))
    {
        require(amount <= MAX_ACCRUED_VALUE);

=======
        _terminateEmployee(employeeId, endDate);
    }

    /**
     * @notice Adds `amount` to accrued value for employee with id `employeeId`
     * @param employeeId Id of the employee
     * @param amount Added amount
     */
    function addAccruedValue(
        uint128 employeeId,
        uint256 amount
    )
        employeeExists(employeeId)
        external
        authP(ADD_ACCRUED_VALUE_ROLE, arr(uint256(employeeId), amount))
    {
        require(amount <= MAX_ACCRUED_VALUE);

>>>>>>> aragon-payroll
        _addAccruedValue(employeeId, amount);
    }

    /**
     * @dev Sends ETH to Finance. This contract should never receive funds,
     *      but in case it happens, this function allows to recover them.
     * @notice Allows to send ETH from this contract to Finance, to avoid locking them in contract forever.
     */
    function escapeHatch() isInitialized external {
        finance.call.value(this.balance)();
    }

    /**
     * @dev Allows to make a simple payment from this contract to Finance,
            to avoid locked tokens in contract forever.
            This contract should never receive tokens with a simple transfer call,
            but in case it happens, this function allows to recover them.
     * @notice Allows to send tokens from this contract to Finance, to avoid locked tokens in contract forever
     */
    function depositToFinance(address token) isInitialized external {
        ERC20 tokenContract = ERC20(token);
        uint256 value = tokenContract.balanceOf(this);
        if (value == 0)
            return;

        // make an approvement for the same value to Finance
        tokenContract.approve(address(finance), value);
        // finally deposit those tokens to Finance
        finance.deposit(tokenContract, value, "Adding Funds");
    }

    /**
     * @dev Set token distribution for payments to an employee (the caller)
     * @notice Set token distribution for payments to an employee (the caller).
     * @param tokens Array with the tokens to receive, they must belong to allowed tokens for employee
     * @param distribution Array (correlated to tokens) with the proportions (integers summing to 100)
     */
    function determineAllocation(address[] tokens, uint8[] distribution) isInitialized employeeMatches external {
        Employee storage employee = employees[employeeIds[msg.sender]];

        // check arrays match
        require(tokens.length == distribution.length);

        // delete previous allocation
        for (uint32 j = 0; j < allowedTokensArray.length; j++) {
            delete employee.allocation[allowedTokensArray[j]];
        }

        // check distribution is right
        uint8 sum = 0;
        for (uint32 i = 0; i < distribution.length; i++) {
            // check token is allowed
            require(allowedTokens[tokens[i]]);
            // set distribution
            employee.allocation[tokens[i]] = distribution[i];
            sum = sum.add(distribution[i]);
        }
        require(sum == 100);

<<<<<<< HEAD
        emit DetermineAllocation(employeeIds[msg.sender], msg.sender);
=======
        DetermineAllocation(employeeIds[msg.sender], msg.sender);
>>>>>>> aragon-payroll
    }

    /**
     * @dev To withdraw payment by employee (the caller). The amount owed since last call will be transferred.
     * @notice To withdraw payment by employee (the caller). The amount owed since last call will be transferred.
     */
    function payday() isInitialized employeeMatches external {
        Employee storage employee = employees[employeeIds[msg.sender]];

        bool somethingPaid = _payTokens(employeeIds[msg.sender]);
        require(somethingPaid);
    }

    /**
     * @dev Change employee account address. To be called by Employee
     * @notice Change employee account address to `newAddress`
     * @param newAddress New address to receive payments
     */
    function changeAddressByEmployee(address newAddress) isInitialized employeeMatches external {
        // check that account doesn't exist
        require(employeeIds[newAddress] == 0);
        // check it's non-null address
        require(newAddress != address(0));

        uint128 employeeId = employeeIds[msg.sender];
        Employee storage employee = employees[employeeId];

<<<<<<< HEAD
        emit ChangeAddressByEmployee(employeeId, employee.accountAddress, newAddress);
=======
        ChangeAddressByEmployee(employeeId, employee.accountAddress, newAddress);
>>>>>>> aragon-payroll
        employee.accountAddress = newAddress;
        employeeIds[newAddress] = employeeId;
        delete employeeIds[msg.sender];
    }

    /**
     * @dev Return all Employee's important info
     * @notice Return all Employee's important info
     * @param accountAddress Employee's address to receive payments
     * @return Employee's identifier
     * @return Employee's annual salary, per second in denomination Token
     * @return Employee's accrued value
     * @return Employee's name
     * @return Employee's last payment received date
     * @return Employee's termination date (max uint64 if none)
     * @return Bool indicating if employee is terminated
     */
    function getEmployeeByAddress(address accountAddress)
        external
        view
        returns (
            uint128 employeeId,
            uint256 denominationSalary,
            uint256 accruedValue,
            string name,
            uint64 lastPayroll,
            uint64 endDate,
            bool terminated
        )
    {
        employeeId = employeeIds[accountAddress];

        Employee memory employee = employees[employeeId];

        denominationSalary = employee.denominationTokenSalary;
        accruedValue = employee.accruedValue;
        name = employee.name;
        lastPayroll = employee.lastPayroll;
        endDate = employee.endDate;
        terminated = employee.terminated;
    }

    /**
     * @dev Return all Employee's important info
     * @notice Return all Employee's important info
     * @param employeeId Employee's identifier
     * @return Employee's address to receive payments
     * @return Employee's annual salary, per second in denomination Token
     * @return Employee's accrued value
     * @return Employee's name
     * @return Employee's last payment received date
     * @return Employee's termination date (max uint64 if none)
     * @return Bool indicating if employee is terminated
     */
    function getEmployee(uint128 employeeId)
        public
        view
        returns (
            address accountAddress,
            uint256 denominationSalary,
            uint256 accruedValue,
            string name,
            uint64 lastPayroll,
            uint64 endDate,
            bool terminated
        )
    {
        Employee memory employee = employees[employeeId];

        accountAddress = employee.accountAddress;
        denominationSalary = employee.denominationTokenSalary;
        accruedValue = employee.accruedValue;
        name = employee.name;
        lastPayroll = employee.lastPayroll;
        endDate = employee.endDate;
        terminated = employee.terminated;
    }

    /**
     * @dev Get payment proportion for a token and an employee (the caller)
     * @notice Get payment proportion for a token and an employee (the caller)
     * @param token The token address
     * @return Allocation for token and employee
     */
    function getAllocation(address token) external view returns (uint8 allocation) {
        return employees[employeeIds[msg.sender]].allocation[token];
    }

    /**
     * @dev Check if a token is allowed
     * @param _token Address of token to check
     * @return True if it's in the list of allowed tokens, False otherwise
     */
    function isTokenAllowed(address _token) external view returns (bool) {
        return allowedTokens[_token];
    }

<<<<<<< HEAD
    // /**
    //  * @dev IForwarder interface conformance. Forwards any employee action.
    //  * @param _evmScript script being executed
    //  */
    // function forward(bytes _evmScript) public {
    //     require(canForward(msg.sender, _evmScript));
    //     bytes memory input = new bytes(0); // TODO: Consider input for this
    //     address[] memory blacklist = new address[](1);
    //     blacklist[0] = address(finance);
    //     runScript(_evmScript, input, blacklist);
    // }
=======
    /**
     * @dev IForwarder interface conformance. Forwards any employee action.
     * @param _evmScript script being executed
     */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript));
        bytes memory input = new bytes(0); // TODO: Consider input for this
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(finance);
        runScript(_evmScript, input, blacklist);
    }
>>>>>>> aragon-payroll

    function isForwarder() public pure returns (bool) {
        return true;
    }

    function canForward(address _sender, bytes) public view returns (bool) {
        // check that employee exists (and matches)
        return (employees[employeeIds[_sender]].accountAddress == _sender);
    }

    function _addEmployee(
        address accountAddress,
        uint256 initialDenominationSalary,
        string name,
        uint64 startDate
    )
        isInitialized
        internal
    {
        // check that account doesn't exist
        require(employeeIds[accountAddress] == 0);

        uint128 employeeId = nextEmployee;
        employees[employeeId] = Employee({
            accountAddress: accountAddress,
            denominationTokenSalary: initialDenominationSalary,
            accruedValue: 0,
            lastPayroll: startDate,
            endDate: MAX_UINT64,
            terminated: false,
            name: name
        });
        // Ids mapping
        employeeIds[accountAddress] = employeeId;
<<<<<<< HEAD
        emit AddEmployee(
=======
        AddEmployee(
>>>>>>> aragon-payroll
            employeeId,
            accountAddress,
            initialDenominationSalary,
            name,
            startDate
        );
        // update global variables
        nextEmployee++;
    }

    function _addAccruedValue(uint128 employeeId, uint256 amount) internal {
        employees[employeeId].accruedValue = employees[employeeId].accruedValue.add(amount);

<<<<<<< HEAD
        emit AddEmployeeAccruedValue(employeeId, amount);
=======
        AddEmployeeAccruedValue(employeeId, amount);
>>>>>>> aragon-payroll
    }

    function _setPriceFeed(IFeed _feed) internal {
        require(_feed != address(0));
        feed = _feed;
<<<<<<< HEAD
        emit SetPriceFeed(feed);
=======
        SetPriceFeed(feed);
>>>>>>> aragon-payroll
    }

    function _setRateExpiryTime(uint64 _time) internal {
        require(_time > 0);
        rateExpiryTime = _time;
<<<<<<< HEAD
        emit SetRateExpiryTime(rateExpiryTime);
=======
        SetRateExpiryTime(rateExpiryTime);
>>>>>>> aragon-payroll
    }

    /**
     * @dev Loop over tokens and send Payroll to employee
     * @param employeeId Id of employee receiving payroll
     * @return True if something has been paid
     */
    function _payTokens(uint128 employeeId) internal returns (bool somethingPaid) {
        Employee storage employee = employees[employeeId];

        // get the min of current date and termination date
        uint64 timestamp = getTimestamp64();
        uint64 toDate;
        if (employee.terminated && employee.endDate < timestamp) {
            toDate = employee.endDate;
        } else {
            toDate = timestamp;
        }

        // compute owed amount
        uint256 owed = employee.accruedValue.add(_getOwedSalary(employeeId, toDate));
        if (owed == 0) {
            return false;
        }

        // update last payroll date and accrued value first thing (to avoid re-entrancy)
        employee.lastPayroll = timestamp;
        employee.accruedValue = 0;

        // loop over allowed tokens
        for (uint32 i = 0; i < allowedTokensArray.length; i++) {
            address token = allowedTokensArray[i];
            if (employee.allocation[token] == 0)
                continue;
            uint128 exchangeRate = getExchangeRate(token);
            require(exchangeRate > 0);
            // salary converted to token and applied allocation percentage
            uint256 tokenAmount = owed.mul(exchangeRate).mul(employee.allocation[token]);
            // dividing by 100 for the allocation and by ONE for the exchange rate
            tokenAmount = tokenAmount / (100 * ONE);
            finance.newPayment(
                token,
                employee.accountAddress,
                tokenAmount,
                0,
                0,
                1,
                ""
            );
            emit SendPayroll(employee.accountAddress, token, tokenAmount);
            somethingPaid = true;
        }

        // try to remove employee
        if (employees[employeeId].terminated &&
            employees[employeeId].endDate <= getTimestamp64() &&
            employees[employeeId].accruedValue == 0
        ) {
            delete employeeIds[employees[employeeId].accountAddress];
            delete employees[employeeId];
        }
    }

    function _terminateEmployee(uint128 employeeId, uint64 endDate) internal {
        // prevent past termination dates
        require(endDate >= getTimestamp64());

        employees[employeeId].terminated = true;
        employees[employeeId].endDate = endDate;

<<<<<<< HEAD
        emit TerminateEmployee(employeeId, employees[employeeId].accountAddress, endDate);
=======
        TerminateEmployee(employeeId, employees[employeeId].accountAddress, endDate);
>>>>>>> aragon-payroll
    }

    function _getOwedSalary(uint128 employeeId, uint64 date) internal view returns (uint256) {
        // get time that has gone by (seconds)
        uint64 time = date.sub(employees[employeeId].lastPayroll);
        if (time == 0) {
            return 0;
        }

        return employees[employeeId].denominationTokenSalary.mul(time);
    }

    /**
     * @dev Check that a token gets a correct exchange rate.
     *      Internal function, needed to ensure that we have a recent rate before making a payment.
     * @param token The token address
     * @return True if we have the exchange rate, false otherwise
     */
    function getExchangeRate(address token) internal view returns (uint128) {
        uint128 xrt;
        uint64 when;

        // denomination token has always exchange rate of 1
        if (token == denominationToken) {
            return ONE;
        }

        (xrt, when) = feed.get(denominationToken, token);

        // check it's recent enough
        if (when < getTimestamp64().sub(rateExpiryTime)) {
            return 0;
        }

        return xrt;
    }
}
