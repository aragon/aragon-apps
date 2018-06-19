pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/Initializable.sol";
import "@aragon/os/contracts/common/IForwarder.sol";

import "@aragon/os/contracts/lib/zeppelin/token/ERC20.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath64.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath8.sol";

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
    bytes32 constant public REMOVE_EMPLOYEE_ROLE = keccak256("REMOVE_EMPLOYEE_ROLE");
    bytes32 constant public ALLOWED_TOKENS_MANAGER_ROLE = keccak256("ALLOWED_TOKENS_MANAGER_ROLE");
    bytes32 constant public CHANGE_PRICE_FEED_ROLE = keccak256("CHANGE_PRICE_FEED_ROLE");
    bytes32 constant public MODIFY_RATE_EXPIRY_ROLE = keccak256("MODIFY_RATE_EXPIRY_ROLE");
    address constant public ETH = address(0);
    uint128 constant public ONE = 10 ** 18; // 10^18 is considered 1 in the price feed to allow for decimal calculations

    struct Employee {
        address accountAddress; // unique, but can be changed over time
        mapping(address => uint8) allocation;
        uint256 denominationTokenSalary; // per second in denomination Token
        uint256 lastPayroll;
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

    event AddEmployee(
        uint128 indexed employeeId,
        address indexed accountAddress,
        uint256 initialDenominationSalary,
        string name,
        uint256 startDate
    );

    event Fund(address indexed sender, address indexed token, uint amount, uint balance, bytes data);
    event SendPayroll(address indexed employee, address indexed token, uint amount);
    event SetPriceFeed(address feed);
    event SetRateExpiryTime(uint64 time);

    modifier employeeExists(uint128 employeeId) {
        /* check that employee exists */
        require(employeeIds[employees[employeeId].accountAddress] != 0);
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
    function setPriceFeed(IFeed _feed) isInitialized external authP(CHANGE_PRICE_FEED_ROLE, arr(feed, _feed)) {
        _setPriceFeed(_feed);
    }

    /**
     * @dev Set the exchange rate expiry time, in seconds. Exchange rates older than it won't be accepted for payments.
     * @notice Sets the exchange rate expiry time to `_time`.
     * @param _time The expiration time in seconds for exchange rates
     */
    function setRateExpiryTime(uint64 _time) isInitialized external authP(MODIFY_RATE_EXPIRY_ROLE, arr(uint256(_time))) {
        _setRateExpiryTime(_time);
    }

    /**
     * @dev Add token to the allowed set
     * @notice Add token to the allowed set
     * @param _allowedToken New token allowed for payment
     */
    function addAllowedToken(address _allowedToken) isInitialized external authP(ALLOWED_TOKENS_MANAGER_ROLE, arr(_allowedToken)) {
        require(!allowedTokens[_allowedToken]);
        allowedTokens[_allowedToken] = true;
        allowedTokensArray.push(_allowedToken);
    }

    /*
     * TODO: removeFromAllowedTokens. It wouldn't be trivial, as employees
     * should modifiy their allocation. They should be notified and their
     * last allocation date should be reset.
     */

    /**
     * @dev Add employee to Payroll
     * @notice Add employee to Payroll. See addEmployeeWithNameAndStartDate
     * @param accountAddress Employee's address to receive Payroll
     * @param initialDenominationSalary Employee's salary, per second in denomination Token
     */
    function addEmployee(
        address accountAddress,
        uint256 initialDenominationSalary
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(accountAddress, initialDenominationSalary, getTimestamp()))
    {
        _addEmployee(
            accountAddress,
            initialDenominationSalary,
            "",
            getTimestamp()
        );
    }

    /**
     * @dev Add employee to Payroll
     * @notice Add employee to Payroll. See addEmployeeWithNameAndStartDate
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
        authP(ADD_EMPLOYEE_ROLE, arr(accountAddress, initialDenominationSalary, getTimestamp()))
    {
        _addEmployee(
            accountAddress,
            initialDenominationSalary,
            name,
            getTimestamp()
        );
    }

    /**
     * @dev Add employee to Payroll
     * @notice Creates employee, adds it to mappings, initializes values.
     * @param accountAddress Employee's address to receive Payroll
     * @param initialDenominationSalary Employee's salary, per second in denomintation Token
     * @param name Employee's name
     * @param startDate It will actually set initial lastPayroll value
     */
    function addEmployeeWithNameAndStartDate(
        address accountAddress,
        uint256 initialDenominationSalary,
        string name,
        uint256 startDate
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
     * @param employeeId Employee's identifier
     * @param denominationSalary Employee's new salary, per second in denomintation Token
     */
    function setEmployeeSalary(
        uint128 employeeId,
        uint256 denominationSalary
    )
        isInitialized
        employeeExists(employeeId)
        external
        authP(ADD_EMPLOYEE_ROLE, arr(employees[employeeId].accountAddress, denominationSalary, 0))
    {
        employees[employeeId].denominationTokenSalary = denominationSalary;
    }

    /**
     * @dev Remove employee from Payroll
     * @param employeeId Employee's identifier
     */
    function removeEmployee(uint128 employeeId) isInitialized employeeExists(employeeId) external auth(REMOVE_EMPLOYEE_ROLE) {
        // Pay owed salary to employee
        _payTokens(employeeId);

        delete employeeIds[employees[employeeId].accountAddress];
        delete employees[employeeId];
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
     * @notice Change employee account address
     * @param newAddress New address to receive payments
     */
    function changeAddressByEmployee(address newAddress) isInitialized employeeMatches external {
        // check that account doesn't exist
        require(employeeIds[newAddress] == 0);
        // check it's non-null address
        require(newAddress != address(0));

        uint128 employeeId = employeeIds[msg.sender];
        Employee storage employee = employees[employeeId];

        employee.accountAddress = newAddress;
        employeeIds[newAddress] = employeeId;
        employeeIds[msg.sender] = 0;
    }

    /**
     * @dev Return all important info too through employees mapping
     * @notice Return all Employee's important info
     * @param employeeId Employee's identifier
     * @return Employee's address to receive payments
     * @return Employee's annual salary, per second in denomination Token
     * @return Employee's name
     * @return Employee's last call to payment distribution date
     * @return Employee's last payment received date
     */
    function getEmployee(uint128 employeeId)
        external
        view
        returns (
            address accountAddress,
            uint256 denominationSalary,
            string name,
            uint256 lastPayroll
        )
    {
        Employee storage employee = employees[employeeId];

        accountAddress = employee.accountAddress;
        denominationSalary = employee.denominationTokenSalary;
        name = employee.name;
        lastPayroll = employee.lastPayroll;
    }

    /**
     * @dev Get payment proportion for a token and an employee (the caller)
     * @notice Get payment proportion for a token and an employee (the caller)
     * @param token The token address
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

    /**
     * @dev IForwarder interface conformance. Forwards any token holder action.
     * @param _evmScript script being executed
     */
    function forward(bytes _evmScript) public {
        require(canForward(msg.sender, _evmScript));
        bytes memory input = new bytes(0); // TODO: Consider input for this
        address[] memory blacklist = new address[](1);
        blacklist[0] = address(finance);
        runScript(_evmScript, input, blacklist);
    }

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
        uint256 startDate
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
            lastPayroll: startDate,
            name: name
        });
        // Ids mapping
        employeeIds[accountAddress] = employeeId;
        AddEmployee(
            employeeId,
            accountAddress,
            initialDenominationSalary,
            name,
            startDate
        );
        // update global variables
        nextEmployee++;
    }

    function _setPriceFeed(IFeed _feed) internal {
        require(_feed != address(0));
        feed = _feed;
        SetPriceFeed(feed);
    }

    function _setRateExpiryTime(uint64 _time) internal {
        require(_time > 0);
        rateExpiryTime = _time;
        SetRateExpiryTime(rateExpiryTime);
    }

    /**
     * @dev Loop over tokens and send Payroll to employee
     * @param employeeId Id of employee receiving payroll
     * @return True if something has been paid
     */
    function _payTokens(uint128 employeeId) internal returns (bool somethingPaid) {
        // get time that has gone by (seconds)
        uint256 time = getTimestamp().sub(employees[employeeId].lastPayroll);
        if (time == 0) {
            return false;
        }
        Employee storage employee = employees[employeeId];
        // update last payroll date first thing (to avoid re-entrancy)
        employee.lastPayroll = getTimestamp();
        // loop over allowed tokens
        somethingPaid = false;
        for (uint32 i = 0; i < allowedTokensArray.length; i++) {
            address token = allowedTokensArray[i];
            if (employee.allocation[token] == 0)
                continue;
            uint128 exchangeRate = getExchangeRate(token);
            require(exchangeRate > 0);
            // salary converted to token and applied allocation percentage
            uint256 tokenAmount = employee.denominationTokenSalary
                .mul(exchangeRate).mul(employee.allocation[token]);
            // dividing by 100 for the allocation and by ONE for the exchange rate
            tokenAmount = tokenAmount.mul(time) / (100 * ONE);
            finance.newPayment(
                token,
                employee.accountAddress,
                tokenAmount,
                0,
                0,
                1,
                ""
            );
            SendPayroll(employee.accountAddress, token, tokenAmount);
            somethingPaid = true;
        }
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
        if (when < uint64(getTimestamp()).sub(rateExpiryTime)) {
            return 0;
        }

        return xrt;
    }

    function getTimestamp() internal view returns (uint256) { return now; }

}
