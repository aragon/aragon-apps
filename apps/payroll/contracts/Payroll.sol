pragma solidity 0.4.15;

import "@aragon/core/contracts/apps/App.sol";
import "@aragon/core/contracts/common/Initializable.sol";
import "@aragon/core/contracts/common/EtherToken.sol";
import "@aragon/core/contracts/common/erc677/ERC677Receiver.sol";

import "@aragon/core/contracts/zeppelin/token/ERC20.sol";
import "@aragon/core/contracts/zeppelin/math/SafeMath.sol";

import "@aragon/apps-finance/contracts/Finance.sol";


/**
 * @title Payroll in multiple currencies
 * @notice For the sake of simplicity lets asume USD is a ERC20 token
 * Also lets asume we can 100% trust the exchange rate oracle
 */
contract Payroll is App, Initializable, ERC677Receiver {
    using SafeMath for uint;

    uint256 constant public MAX_UINT = uint256(-1);
    // kernel roles
    bytes32 constant public EMPLOYER_ROLE = bytes32(1);
    bytes32 constant public ORACLE_ROLE = bytes32(2);

    struct Employee {
        address accountAddress; // unique, but can be changed over time
        mapping(address => uint256) allocation;
        uint256 yearlyUSDSalary;
        uint lastAllocation;
        uint lastPayroll;
        string name;
    }

    uint private numEmployees;
    uint private nextEmployee; // starts at 1
    mapping(uint => Employee) private employees;
    mapping(address => uint) private employeeIds;
    uint256 private yearlyTotalPayroll;

    Finance public finance;
    address public usdToken;
    EtherToken public etherToken;
    mapping(address => uint256) private exchangeRates;
    mapping(address => bool) allowedTokens;
    address[] allowedTokensArray;

    event LogFund (address sender, address token, uint amount, uint balance, bytes data);
    event LogSendPayroll (address sender, address token, uint amount);
    event LogSetExchangeRate (address token, uint rate);

    /**
     * @notice Initialize Payroll app for `_finance`. Set ETH and USD tokens
     * @param _finance Address of the finance Payroll will rely on (non changeable)
     * @param _etherToken Address of EtherToken
     * @param _usdToken Address of USD Token
     */
    function initialize(
        Finance _finance,
        EtherToken _etherToken,
        address _usdToken
    ) external
        onlyInit
    {
        initialized();

        numEmployees = 0;
        nextEmployee = 1; // leave 0 to check null address mapping
        finance = _finance;
        etherToken = _etherToken;
        usdToken = _usdToken;
        exchangeRates[usdToken] = 10**6; // 6 decimals for sub-cent precision
        // add ETH and USD to allowed tokens by default
        allowedTokens[etherToken] = true;
        allowedTokensArray.push(etherToken);
        allowedTokens[usdToken] = true;
        allowedTokensArray.push(usdToken);
    }

    /**
     * @dev To be able to receive ERC677 Token transfers, using transfer
     *      See: https://github.com/ethereum/EIPs/issues/677
     * @notice To be able to receive ERC677 Token transfers, using transfer
     * @param from  Token sender address.
     * @param value Amount of tokens.
     * @param data  Transaction metadata.
     */
    function tokenFallback(address from, uint256 value, bytes data) external returns(bool success) {
        ERC677Token tokenContract = ERC677Token(msg.sender);
        LogFund(
            from,
            msg.sender,
            value,
            tokenContract.balanceOf(this),
            data
        );
        return tokenContract.transferAndCall(address(finance), value, "Adding funds");
    }

    /**
     * @dev Set the USD exchange rate for a token. Uses decimals from token
     * @notice Sets the USD exchange rate for a token
     * @param token The token address
     * @param usdExchangeRate The exchange rate
     */
    function setExchangeRate(address token, uint256 usdExchangeRate) external auth(ORACLE_ROLE) {
        // USD Token is a special one, so we can not allow its exchange rate to be changed
        if (token != usdToken) {
            exchangeRates[token] = usdExchangeRate;
            LogSetExchangeRate(token, usdExchangeRate);
        }
    }

    /**
     * @dev Add tokens to the allowed set
     * @notice Add tokens to the allowed set
     * @param _allowedTokens Array of new tokens allowed for payment
     */
    function addAllowedTokens(address[] _allowedTokens) public auth(EMPLOYER_ROLE) {
        for (uint i = 0; i < _allowedTokens.length; i++) {
            if (!allowedTokens[_allowedTokens[i]]) {
                allowedTokens[_allowedTokens[i]] = true;
                allowedTokensArray.push(_allowedTokens[i]);
            }
        }
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
     * @param initialYearlyUSDSalary Employee's salary
     */
    function addEmployee(
        address accountAddress,
        uint256 initialYearlyUSDSalary
    )
        public
        auth(EMPLOYER_ROLE)
    {
        _addEmployee(
            accountAddress,
            initialYearlyUSDSalary,
            "",
            getTimestamp()
        );
    }

    /**
     * @dev Add employee to Payroll
     * @notice Add employee to Payroll. See addEmployeeWithNameAndStartDate
     * @param accountAddress Employee's address to receive Payroll
     * @param initialYearlyUSDSalary Employee's salary
     * @param name Employee's name
     */
    function addEmployeeWithName(
        address accountAddress,
        uint256 initialYearlyUSDSalary,
        string name
    )
        public
        auth(EMPLOYER_ROLE)
    {
        _addEmployee(
            accountAddress,
            initialYearlyUSDSalary,
            name,
            getTimestamp()
        );
    }

    /**
     * @dev Add employee to Payroll
     * @notice Creates employee, adds it to mappings, initializes values.
               Updates also global Payroll salary sum.
     * @param accountAddress Employee's address to receive Payroll
     * @param initialYearlyUSDSalary Employee's salary
     * @param name Employee's name
     * @param startDate It will actually set initial lastPayroll value
     */
    function addEmployeeWithNameAndStartDate(
        address accountAddress,
        uint256 initialYearlyUSDSalary,
        string name,
        uint256 startDate
    )
        public
        auth(EMPLOYER_ROLE)
    {
        _addEmployee(
            accountAddress,
            initialYearlyUSDSalary,
            name,
            startDate
        );
    }

    /**
     * @dev Set employee's annual salary
     * @notice Updates also global Payroll salary sum
     * @param employeeId Employee's identifier
     * @param yearlyUSDSalary Employee's new salary
     */
    function setEmployeeSalary(uint256 employeeId, uint256 yearlyUSDSalary) public auth(EMPLOYER_ROLE) {
        /* check that employee exists */
        require(employeeIds[employees[employeeId].accountAddress] != 0);

        yearlyTotalPayroll = yearlyTotalPayroll.sub(employees[employeeId].yearlyUSDSalary);
        employees[employeeId].yearlyUSDSalary = yearlyUSDSalary;
        yearlyTotalPayroll = yearlyTotalPayroll.add(yearlyUSDSalary);
    }

    /**
     * @dev Remove employee from Payroll
     * @notice Updates also global Payroll salary sum
     * @param employeeId Employee's identifier
     */
    function removeEmployee(uint256 employeeId) public auth(EMPLOYER_ROLE) {
        /* check that employee exists */
        require(employeeIds[employees[employeeId].accountAddress] != 0);

        yearlyTotalPayroll = yearlyTotalPayroll.sub(employees[employeeId].yearlyUSDSalary);
        delete employeeIds[employees[employeeId].accountAddress];
        delete employees[employeeId];
        numEmployees--;
    }

    /**
     * @dev Payable function to receive ETH
     * @notice Payable function to receive ETH
     */
    function addFunds() public payable {
        // convert ETH to EtherToken
        etherToken.wrapAndCall.value(this.balance)(address(finance), "Adding Funds");
        assert(this.balance == 0);
        LogFund(
            msg.sender,
            address(etherToken),
            msg.value,
            etherToken.balanceOf(this),
            ""
        );
    }

    /**
     * @dev Allows make a simple payment from this contract to Finance,
            to avoid locked tokens in contract forever.
            This contract should never receive tokens with a simple transfer call,
            but in case it happens, this function allows to recover them.
     * @notice Allows to send tokens from this contract to Finance, to avoid locked tokens in contract forever
     */
    function depositToFinance(address token) public {
        ERC20 tokenContract = ERC20(token);
        uint256 value = tokenContract.balanceOf(this);
        if (value == 0)
            return;

        // make an aprovement for the same value to Finance
        tokenContract.approve(address(finance), value);
        // finally deposit those tokens to Finance
        finance.deposit(tokenContract, value, "Adding Funds");
        LogFund(
            finance,
            token,
            value,
            tokenContract.balanceOf(this),
            ""
        );
    }

    /**
     * @dev To be able to receive ERC20 Token transfers, using approveAndCall
     *      See, e.g: https://www.ethereum.org/token
     * @notice To be able to receive ERC20 Token transfers, using approveAndCall
     * @param from  Token sender address.
     * @param value Amount of tokens.
     * @param token Token to be received.
     * @param data  Transaction metadata.
     */
    function receiveApproval(
        address from,
        uint256 value,
        address token,
        bytes data
    )
        public
        returns(bool success)
    {
        ERC20 tokenContract = ERC20(token);

        // first send tokens to this contract
        require(tokenContract.transferFrom(from, this, value));
        // then make an aprrovement for the same value to Finance
        tokenContract.approve(address(finance), value);
        // finally deposit those tokens to Finance
        finance.deposit(tokenContract, value, "Adding Funds");

        LogFund(
            from,
            token,
            value,
            tokenContract.balanceOf(this),
            data
        );

        return true;
    }

    /**
     * @dev Get number of employees in Payroll
     * @notice Get number of employees in Payroll
     * @return Number of employees
     */
    function getEmployeeCount() public constant returns(uint256 count) {
        count = numEmployees;
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
    function getEmployee(uint256 employeeId)
        public
        constant
        returns(
            address accountAddress,
            uint256 yearlyUSDSalary,
            string name,
            uint lastAllocation,
            uint lastPayroll
        )
    {
        var employee = employees[employeeId];

        accountAddress = employee.accountAddress;
        yearlyUSDSalary = employee.yearlyUSDSalary;
        name = employee.name;
        lastAllocation = employee.lastAllocation;
        lastPayroll = employee.lastPayroll;
    }

    /**
     * @dev Get total amount of salaries in Payroll
     * @notice Get total amount of salaries in Payroll
     * @return Integer with the amount
     */
    function getYearlyTotalPayroll() public constant returns(uint256 total) {
        total = yearlyTotalPayroll;
    }

    /**
     * @dev Monthly USD amount spent in salaries
     * @notice Monthly USD amount spent in salaries
     * @return Integer with the monthly amount
     */
    function calculatePayrollBurnrate() public constant returns(uint256 payrollBurnrate) {
        payrollBurnrate = yearlyTotalPayroll / 12;
    }

    /**
     * @dev Days until the contract can run out of funds
     * @notice Days until the contract can run out of funds
     * @return Integer with the number of days
     */
    function calculatePayrollRunway() public constant returns(uint256 payrollRunway) {
        if (yearlyTotalPayroll == 0)
            return MAX_UINT;

        uint256 balance = 0;
        // for each token, get finance balance and convert it to USD
        for (uint i = 0; i < allowedTokensArray.length; i ++) {
            var token = allowedTokensArray[i];
            var tokenContract = ERC20(token);
            if (exchangeRates[token] == 0)
                continue;
            balance = balance.add(tokenContract.balanceOf(finance).div(exchangeRates[token]));
        }
        payrollRunway = balance.mul(365) / yearlyTotalPayroll;
    }

    /**
     * @dev Set token distribution for payments to an employee (the caller)
     * @notice Set token distribution for payments to an employee (the caller).
     *         Only callable once every 6 months
     * @param tokens Array with the tokens to receive, they must belong to allowed tokens for employee
     * @param distribution Array (correlated to tokens) with the proportions (integers over 100)
     */
    function determineAllocation(address[] tokens, uint256[] distribution) public {
        var employee = employees[employeeIds[msg.sender]];
        // check that employee exists (and matches)
        require(employee.accountAddress == msg.sender);
        // check that enough time has gone by
        require(getTimestamp() > employee.lastAllocation && getTimestamp() - employee.lastAllocation > 15768000); // half a year in seconds

        // check arrays match
        require(tokens.length == distribution.length);

        // check distribution is right
        uint256 sum = 0;
        uint256 i;
        for (i = 0; i < distribution.length; i++) {
            // check token is allowed
            require(allowedTokens[tokens[i]]);
            // set distribution
            employee.allocation[tokens[i]] = distribution[i];
            sum = sum.add(distribution[i]);
        }
        require(sum == 100);

        employee.lastAllocation = getTimestamp();
    }

    /**
     * @dev Get payment proportion for a token and an employee (the caller)
     * @notice Get payment proportion for a token and an employee (the caller)
     * @param token The token address
     */
    function getAllocation(address token) public constant returns(uint256 allocation) {
        var employee = employees[employeeIds[msg.sender]];
        // check that employee exists (and matches)
        require(employee.accountAddress == msg.sender);

        allocation = employee.allocation[token];
    }

    /**
     * @dev payday To withdraw monthly payment by employee (the caller)
     * @notice Only callable once a month. Assumed token has these standard checks implemented:
     *         https://theethereum.wiki/w/index.php/ERC20_Token_Standard#How_Does_A_Token_Contract_Work.3F
     */
    function payday() public {
        var employee = employees[employeeIds[msg.sender]];
        // check that employee exists (and matches)
        require(employee.accountAddress == msg.sender);
        // check that enough time has gone by
        require(getTimestamp() > employee.lastPayroll && getTimestamp() - employee.lastPayroll > 2628000); // 1/12 year in seconds

        // loop over allowed tokens
        bool somethingPaid = false;
        for (uint i = 0; i < allowedTokensArray.length; i++) {
            var token = allowedTokensArray[i];
            if (employee.allocation[token] == 0)
                continue;
            require(checkExchangeRate(token));
            // salary converted to token and applied allocation percentage
            uint256 tokenAmount = employee.yearlyUSDSalary
                .mul(exchangeRates[token]).mul(employee.allocation[token]) / 100;
            tokenAmount = tokenAmount / 12; // yearly to monthly
            ERC20 tokenContract = ERC20(token);
            finance.newPayment(
                tokenContract,
                msg.sender,
                tokenAmount,
                0,
                0,
                1,
                ""
            );
            LogSendPayroll(msg.sender, token, tokenAmount);
            somethingPaid = true;
        }
        require(somethingPaid);
        // finally update last payroll date
        employee.lastPayroll += 1 years / 12;
    }

    /**
     * @dev Change employee account address. To be called by Employer.
     * @notice Change employee account address
     * @param employeeId Employee's identifier
     * @param newAddress New address to receive payments
     */
    function changeAddressByOwner(uint256 employeeId, address newAddress) public auth(EMPLOYER_ROLE) {
        // check that account doesn't exist
        require(employeeIds[newAddress] == 0);
        // check it's non-null address
        require (newAddress != address(0));

        var employee = employees[employeeId];
        employeeIds[employee.accountAddress] = 0;
        employee.accountAddress = newAddress;
        employeeIds[newAddress] = employeeId;
    }

    /**
     * @dev Change employee account address. To be called by Employee
     * @notice Change employee account address
     * @param newAddress New address to receive payments
     */
    function changeAddressByEmployee(address newAddress) public {
        // check that account doesn't exist
        require(employeeIds[newAddress] == 0);
        // check it's non-null address
        require (newAddress != address(0));
        // check that employee exists (and matches)
        var employeeId = employeeIds[msg.sender];
        var employee = employees[employeeId];
        require(employee.accountAddress == msg.sender);

        employee.accountAddress = newAddress;
        employeeIds[newAddress] = employeeId;
        employeeIds[msg.sender] = 0;
    }

    /* Aux functions */
    /**
     * @dev Get the USD exchange rate of a Token
     * @notice Get the USD exchange rate of a Token
     * @param token The token address
     * @return usdExchangeRate The exchange rate
     */
    function getExchangeRate(address token) public constant returns(uint256 rate) {
        rate = exchangeRates[token];
    }

    /**
     * @dev Check that a token has the exchange rate already set
     *      Internal function, needed to ensure that we have the rate before making a payment.
     * @param token The token address
     * @return True if we have the exchange rate, false otherwise
     */
    function checkExchangeRate(address token) internal returns(bool) {
        if (exchangeRates[token] == 0) {
            return false;
        }
        return true;
    }

    function _addEmployee(
        address accountAddress,
        uint256 initialYearlyUSDSalary,
        string name,
        uint256 startDate
    )
        internal
    {
        // check that account doesn't exist
        require(employeeIds[accountAddress] == 0);

        var employeeId = nextEmployee;
        employees[employeeId] = Employee({
            accountAddress: accountAddress,
            yearlyUSDSalary: initialYearlyUSDSalary,
            lastAllocation: 0,
            lastPayroll: startDate,
            name: name
        });
        // Ids mapping
        employeeIds[accountAddress] = employeeId;
        // update global variables
        yearlyTotalPayroll = yearlyTotalPayroll.add(initialYearlyUSDSalary);
        numEmployees++;
        nextEmployee++;
    }

    function getTimestamp() internal constant returns (uint256) { return now; }

}
