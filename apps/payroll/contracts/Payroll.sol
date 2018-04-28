pragma solidity 0.4.18;

import "@aragon/os/contracts/apps/AragonApp.sol";
import "@aragon/os/contracts/common/Initializable.sol";
import "@aragon/os/contracts/common/IForwarder.sol";

import "@aragon/os/contracts/lib/zeppelin/token/ERC20.sol";
import "@aragon/os/contracts/lib/zeppelin/math/SafeMath.sol";

import "@aragon/apps-finance/contracts/Finance.sol";

import "./DenominationToken.sol";


/**
 * @title Payroll in multiple currencies
 */
contract Payroll is AragonApp { //, IForwarder { // makes coverage crash (removes pure and interface doesnt match)
    using SafeMath for uint256;
    using DenominationToken for uint256;

    // kernel roles
    bytes32 constant public ADD_EMPLOYEE_ROLE = keccak256("ADD_EMPLOYEE_ROLE");
    bytes32 constant public REMOVE_EMPLOYEE_ROLE = keccak256("REMOVE_EMPLOYEE_ROLE");
    bytes32 constant public ALLOWED_TOKENS_MANAGER_ROLE = keccak256("ALLOWED_TOKENS_MANAGER_ROLE");
    bytes32 constant public ORACLE_ROLE = keccak256("ORACLE_ROLE");
    address constant public ETH = address(0);

    struct Employee {
        address accountAddress; // unique, but can be changed over time
        mapping(address => uint8) allocation;
        uint256 denominationTokenSalary; // per second
        uint256 lastPayroll;
        string name;
    }

    uint128 public nextEmployee; // starts at 1
    mapping(uint128 => Employee) private employees;
    mapping(address => uint128) private employeeIds;

    Finance public finance;
    address public denominationToken;
    mapping(address => uint256) private exchangeRates;
    mapping(address => bool) private allowedTokens;
    address[] private allowedTokensArray;

    event EmployeeAdded(
        uint128 employeeId,
        address accountAddress,
        uint256 initialYearlyDenominationSalary,
        string name,
        uint256 startDate
    );

    event Fund(address sender, address token, uint amount, uint balance, bytes data);
    event SendPayroll(address employee, address token, uint amount);
    event ExchangeRateSet(address token, uint rate);

    /**
     * @notice Initialize Payroll app for `_finance`. Set ETH and Denomination tokens
     * @param _finance Address of the finance Payroll will rely on (non changeable)
     * @param _denominationToken Address of Denomination Token
     */
    function initialize(
        Finance _finance,
        address _denominationToken
    ) external
        onlyInit
    {
        initialized();

        nextEmployee = 1; // leave 0 to check null address mapping
        finance = _finance;
        denominationToken = _denominationToken;
        exchangeRates[address(denominationToken)] = 1;
    }

    /**
     * @dev Set the Denomination exchange rate for a token. Uses decimals from token
     * @notice Sets the Denomination exchange rate for a token
     * @param token The token address
     * @param denominationExchangeRate The exchange rate
     */
    function setExchangeRate(
        address token,
        uint256 denominationExchangeRate
    )
        external
        authP(ORACLE_ROLE, arr(token, denominationExchangeRate, exchangeRates[token]))
    {
        // Denomination Token is a special one, so we can not allow its exchange rate to be changed
        require(token != denominationToken);
        exchangeRates[token] = denominationExchangeRate;
        ExchangeRateSet(token, denominationExchangeRate);
    }

    /**
     * @dev Add token to the allowed set
     * @notice Add token to the allowed set
     * @param _allowedToken New token allowed for payment
     */
    function addAllowedToken(address _allowedToken) external authP(ALLOWED_TOKENS_MANAGER_ROLE, arr(_allowedToken)) {
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
     * @param initialYearlyDenominationSalary Employee's salary
     */
    function addEmployee(
        address accountAddress,
        uint256 initialYearlyDenominationSalary
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(initialYearlyDenominationSalary, getTimestamp()))
    {
        _addEmployee(
            accountAddress,
            initialYearlyDenominationSalary,
            "",
            getTimestamp()
        );
    }

    /**
     * @dev Add employee to Payroll
     * @notice Add employee to Payroll. See addEmployeeWithNameAndStartDate
     * @param accountAddress Employee's address to receive Payroll
     * @param initialYearlyDenominationSalary Employee's salary
     * @param name Employee's name
     */
    function addEmployeeWithName(
        address accountAddress,
        uint256 initialYearlyDenominationSalary,
        string name
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(initialYearlyDenominationSalary, getTimestamp()))
    {
        _addEmployee(
            accountAddress,
            initialYearlyDenominationSalary,
            name,
            getTimestamp()
        );
    }

    /**
     * @dev Add employee to Payroll
     * @notice Creates employee, adds it to mappings, initializes values.
               Updates also global Payroll salary sum.
     * @param accountAddress Employee's address to receive Payroll
     * @param initialYearlyDenominationSalary Employee's salary
     * @param name Employee's name
     * @param startDate It will actually set initial lastPayroll value
     */
    function addEmployeeWithNameAndStartDate(
        address accountAddress,
        uint256 initialYearlyDenominationSalary,
        string name,
        uint256 startDate
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(initialYearlyDenominationSalary, startDate))
    {
        _addEmployee(
            accountAddress,
            initialYearlyDenominationSalary,
            name,
            startDate
        );
    }

    /**
     * @dev Set employee's annual salary
     * @notice Updates also global Payroll salary sum
     * @param employeeId Employee's identifier
     * @param yearlyDenominationSalary Employee's new salary
     */
    function setEmployeeSalary(
        uint128 employeeId,
        uint256 yearlyDenominationSalary
    )
        external
        authP(ADD_EMPLOYEE_ROLE, arr(yearlyDenominationSalary, 0))
    {
        /* check that employee exists */
        require(employeeIds[employees[employeeId].accountAddress] != 0);

        employees[employeeId].denominationTokenSalary = yearlyDenominationSalary.toSecondDenominationToken();
    }

    /**
     * @dev Remove employee from Payroll
     * @notice Updates also global Payroll salary sum
     * @param employeeId Employee's identifier
     */
    function removeEmployee(uint128 employeeId) external auth(REMOVE_EMPLOYEE_ROLE) {
        /* check that employee exists */
        require(employeeIds[employees[employeeId].accountAddress] != 0);

        // Pay owed salary to employee
        // get time that has gone by (seconds)
        uint256 time = getTimestamp().sub(employees[employeeId].lastPayroll);
        if (time > 0)
            _payTokens(employeeId, time);

        delete employeeIds[employees[employeeId].accountAddress];
        delete employees[employeeId];
    }

    /**
     * @dev Sends ETH to Finance. This contract should never receive funds,
     *      but in case it happens, this function allows to recover them.
     * @notice Allows to send ETH from this contract to Finance, to avoid locking them in contract forever.
     */
    function escapeHatch() external {
        finance.call.value(this.balance)();
    }

    /**
     * @dev Allows to make a simple payment from this contract to Finance,
            to avoid locked tokens in contract forever.
            This contract should never receive tokens with a simple transfer call,
            but in case it happens, this function allows to recover them.
     * @notice Allows to send tokens from this contract to Finance, to avoid locked tokens in contract forever
     */
    function depositToFinance(address token) external {
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
     *         Only callable once every 6 months
     * @param tokens Array with the tokens to receive, they must belong to allowed tokens for employee
     * @param distribution Array (correlated to tokens) with the proportions (integers over 100)
     */
    function determineAllocation(address[] tokens, uint8[] distribution) external {
        Employee storage employee = employees[employeeIds[msg.sender]];
        // check that employee exists (and matches)
        require(employee.accountAddress == msg.sender);

        // check arrays match
        require(tokens.length == distribution.length);

        // check distribution is right
        uint8 sum = 0;
        uint32 i;
        for (i = 0; i < distribution.length; i++) {
            // check token is allowed
            require(allowedTokens[tokens[i]]);
            // set distribution
            employee.allocation[tokens[i]] = distribution[i];
            sum += distribution[i];
            require(sum >= distribution[i]);
        }
        require(sum == 100);
    }

    /**
     * @dev To withdraw payment by employee (the caller). The amount owed since last call will be transferred.
     * @notice To withdraw payment by employee (the caller). The amount owed since last call will be transferred.
     */
    function payday() external {
        Employee storage employee = employees[employeeIds[msg.sender]];
        // check that employee exists (and matches)
        require(employees[employeeIds[msg.sender]].accountAddress == msg.sender);
        // get time that has gone by (seconds)
        uint256 time = getTimestamp().sub(employees[employeeIds[msg.sender]].lastPayroll);
        require(time > 0);

        bool somethingPaid = _payTokens(employeeIds[msg.sender], time);
        require(somethingPaid);

        // finally update last payroll date
        employee.lastPayroll = getTimestamp();
    }

    /**
     * @dev Change employee account address. To be called by Employee
     * @notice Change employee account address
     * @param newAddress New address to receive payments
     */
    function changeAddressByEmployee(address newAddress) external {
        // check that account doesn't exist
        require(employeeIds[newAddress] == 0);
        // check it's non-null address
        require(newAddress != address(0));
        // check that employee exists (and matches)
        uint128 employeeId = employeeIds[msg.sender];
        Employee storage employee = employees[employeeId];
        // check that employee exists (and matches)
        require(employee.accountAddress == msg.sender);

        employee.accountAddress = newAddress;
        employeeIds[newAddress] = employeeId;
        employeeIds[msg.sender] = 0;
    }

    /**
     * @dev Return all important info too through employees mapping
     * @notice Return all Employee's important info
     * @param employeeId Employee's identifier
     * @return Employee's address to receive payments
     * @return Employee's annual salary
     * @return Employee's name
     * @return Employee's last call to payment distribution date
     * @return Employee's last payment received date
     */
    function getEmployee(uint128 employeeId)
        external
        view
        returns (
            address accountAddress,
            uint256 yearlyDenominationSalary,
            string name,
            uint256 lastPayroll
        )
    {
        Employee storage employee = employees[employeeId];

        accountAddress = employee.accountAddress;
        yearlyDenominationSalary = employee.denominationTokenSalary.toYearlyDenomination();
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
     * @dev Get the Denomination exchange rate of a Token
     * @notice Get the Denomination exchange rate of a Token
     * @param token The token address
     * @return denominationExchangeRate The exchange rate
     */
    function getExchangeRate(address token) external view returns (uint256 rate) {
        rate = exchangeRates[token];
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
        uint256 initialYearlyDenominationSalary,
        string name,
        uint256 startDate
    )
        internal
    {
        // check that account doesn't exist
        require(employeeIds[accountAddress] == 0);

        uint128 employeeId = nextEmployee;
        employees[employeeId] = Employee({
            accountAddress: accountAddress,
            denominationTokenSalary: initialYearlyDenominationSalary.toSecondDenominationToken(),
            lastPayroll: startDate,
            name: name
        });
        // Ids mapping
        employeeIds[accountAddress] = employeeId;
        EmployeeAdded(
            employeeId,
            accountAddress,
            initialYearlyDenominationSalary,
            name,
            startDate
        );
        // update global variables
        nextEmployee++;
    }

    /**
     * @dev Loop over tokens and send Payroll to employee
     * @param employeeId Id of employee receiving payroll
     * @param time Time owed to employee (since last payroll)
     * @return True if something has been paid
     */
    function _payTokens(uint128 employeeId, uint256 time) internal returns (bool somethingPaid) {
        Employee storage employee = employees[employeeId];
        // loop over allowed tokens
        somethingPaid = false;
        for (uint32 i = 0; i < allowedTokensArray.length; i++) {
            address token = allowedTokensArray[i];
            if (employee.allocation[token] == 0)
                continue;
            require(checkExchangeRate(token));
            // salary converted to token and applied allocation percentage
            uint256 tokenAmount = employee.denominationTokenSalary
                .mul(exchangeRates[token]).mul(employee.allocation[token]) / 100;
            tokenAmount = tokenAmount.mul(time);
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
     * @dev Check that a token has the exchange rate already set
     *      Internal function, needed to ensure that we have the rate before making a payment.
     * @param token The token address
     * @return True if we have the exchange rate, false otherwise
     */
    function checkExchangeRate(address token) internal view returns (bool) {
        if (exchangeRates[token] == 0) {
            return false;
        }
        return true;
    }

    function getTimestamp() internal view returns (uint256) { return now; }

}
