pragma solidity 0.4.15;

import "./oracle/OracleInterface.sol";

import "@aragon/core/contracts/apps/App.sol";
import "@aragon/core/contracts/common/Initializable.sol";
import "@aragon/core/contracts/common/EtherToken.sol";
import "@aragon/core/contracts/common/erc677/ERC677Receiver.sol";

import "@aragon/core/contracts/zeppelin/token/ERC20.sol";
import "@aragon/core/contracts/zeppelin/math/SafeMath.sol";

import "@aragon/apps-finance/contracts/Finance.sol";
//import "@aragon/apps-vault/contracts/Vault.sol";


/**
 * @title Payroll in multiple currencies
 * @notice For the sake of simplicity lets asume USD is a ERC20 token
 * Also lets asume we can 100% trust the exchange rate oracle
 */
contract Payroll is App, Initializable, ERC677Receiver {
    using SafeMath for uint;

    bytes32 constant public OWNER_WRITE_ROLE = bytes32(1);
    bytes32 constant public OWNER_READ_ROLE = bytes32(2);
    bytes32 constant public EMPLOYEE_ROLE = bytes32(3);
    bytes32 constant public ORACLE_ROLE = bytes32(4);

    struct Employee {
        address accountAddress; // unique, but can be changed over time
        mapping(address => bool) allowedTokens; // Could it be defined globally?
        address[] allowedTokensArray;
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
    address public oracle;
    address public usdToken;
    EtherToken public etherToken;
    mapping(address => uint256) private exchangeRates;
    mapping(address => bool) globalTokens;
    address[] globalTokensArray;

    address public employer;

    event LogFund (address sender, address token, uint amount, uint balance, bytes data);
    event LogSendPayroll (address sender, address token, uint amount);
    event LogSetExchangeRate (address token, uint rate);

    /**
     * @notice Initialize Payroll app for `_finance` with oracle at `_oracleAddress`
     * @param _finance Address of the finance Payroll will rely on (non changeable)
     * @param _etherToken Address of EtherToken
     * @param _usdToken Address of USD Token
     * @param _oracleAddress Address of Oracle used to update Token exchange rates
     */
    function initialize(
        Finance _finance,
        EtherToken _etherToken,
        address _usdToken,
        address _oracleAddress
    ) external
        onlyInit
    {
        initialized();

        employer = msg.sender;
        numEmployees = 0;
        nextEmployee = 1; // leave 0 to check null address mapping
        finance = _finance;
        etherToken = _etherToken;
        usdToken = _usdToken;
        exchangeRates[usdToken] = 100; // 2 decimals for cents
        oracle = _oracleAddress;
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
     * @dev Set Oracle address
     * @notice Set Oracle address
     * @param oracleAddress Address of Oracle used to update Token exchange rates
     */
    function setOracle(address oracleAddress) public auth(OWNER_WRITE_ROLE) {
        oracle = oracleAddress;
    }

    /**
     * @dev Add employee to Payroll
     * @notice It actually calls function addEmployeeWithName
     * @param accountAddress Employer's address to receive Payroll
     * @param allowedTokens Array of tokens allowed for payment
     * @param initialYearlyUSDSalary Employee's salary
     */
    function addEmployee(
        address accountAddress,
        address[] allowedTokens,
        uint256 initialYearlyUSDSalary
    )
        public
        auth(OWNER_WRITE_ROLE)
    {
        _addEmployeeWithName(
            accountAddress,
            allowedTokens,
            initialYearlyUSDSalary,
            ""
        );
    }

    /**
     * @dev Add employee to Payroll
     * @notice Creates employee, adds it to mappings, initializes values
               and tries to update allowed tokens exchange rates if needed.
               Updates also global Payroll salary sum.
     * @param accountAddress Employer's address to receive Payroll
     * @param allowedTokens Array of tokens allowed for payment
     * @param initialYearlyUSDSalary Employee's salary
     * @param name Employee's name
     */
    function addEmployeeWithName(
        address accountAddress,
        address[] allowedTokens,
        uint256 initialYearlyUSDSalary,
        string name
    )
        public
        auth(OWNER_WRITE_ROLE)
    {
        _addEmployeeWithName(
            accountAddress,
            allowedTokens,
            initialYearlyUSDSalary,
            name
        );
    }

    /**
     * @dev Set employee's annual salary
     * @notice Updates also global Payroll salary sum
     * @param employeeId Employee's identifier
     * @param yearlyUSDSalary Employee's new salary
     */
    function setEmployeeSalary(uint256 employeeId, uint256 yearlyUSDSalary) public auth(OWNER_WRITE_ROLE) {
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
    function removeEmployee(uint256 employeeId) public auth(OWNER_WRITE_ROLE) {
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
        etherToken.wrapAndCall.value(msg.value)(address(finance), "Adding Funds");
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
    function depositToFinance(address token) public auth(OWNER_WRITE_ROLE) {
        ERC20 tokenContract = ERC20(token);
        uint256 value = tokenContract.balanceOf(this);
        require(value >= 0);

        // make an aprrovement for the same value to Finance
        tokenContract.approve(address(finance), value);
        // finally deposit those tokens to Finance
        finance.deposit(tokenContract, value, "Adding Funds");
    }

    /**
     * @dev Implement escape hatch mechanism. Avoids locked in contract forever
     * @notice Implement escape hatch mechanism. Avoids locked in contract forever
     */
    function escapeHatch() public auth(OWNER_WRITE_ROLE) {
        for (uint i = 0; i < globalTokensArray.length; i++) {
            var token = globalTokensArray[i];
            ERC20 tokenContract = ERC20(token);
            uint256 tokenBalance = tokenContract.balanceOf(this);
            // Avoid zero balances
            if (tokenBalance == 0)
                continue;
            // send balance to owner
            if (token != address(etherToken)) {
                tokenContract.transfer(employer, tokenBalance);
            } else {
                etherToken.withdraw(employer, tokenBalance); // withdraw ether to receiver
            }
            LogFund(
                employer,
                token,
                tokenBalance,
                tokenContract.balanceOf(this),
                ""
            );
        }
        selfdestruct(employer); // send funds to organizer
    }

    /**
     * @dev Implement escape hatch mechanism for critical case. Avoids locked in contract forever
     * @notice Implement escape hatch mechanism for critical case.
               Avoids locked in contract forever. If above function fails
               (imagine, e.g., a bad token with a failing implementation of transfer),
               this one would at least recover ETH (which btw should never remain in this contract).
     */
    function escapeHatch2() public auth(OWNER_WRITE_ROLE) {
        selfdestruct(employer); // send funds to organizer
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
        tokenContract.transferFrom(from, this, value);
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
    function getEmployeeCount() public constant auth(OWNER_READ_ROLE) returns(uint256 count) {
        count = numEmployees;
    }

    /**
     * @dev Return all important info too through employees mapping
     * @notice Return all Employee's important info
     * @param employeeId Employee's identifier
     * @return Employee's address to receive payments
     * @return Employee's annual salary
     * @return Employee's name
     * @return Employee's allowed tokens
     * @return Employee's last call to payment distribution date
     * @return Employee's last payment received date
     */
    function getEmployee(uint256 employeeId)
        public
        constant
        auth(OWNER_READ_ROLE)
        returns(
            address accountAddress,
            uint256 yearlyUSDSalary,
            string name,
            address[] allowedTokens,
            uint lastAllocation,
            uint lastPayroll
        )
    {
        var employee = employees[employeeId];

        accountAddress = employee.accountAddress;
        yearlyUSDSalary = employee.yearlyUSDSalary;
        name = employee.name;
        allowedTokens = employee.allowedTokensArray;
        lastAllocation = employee.lastAllocation;
        lastPayroll = employee.lastPayroll;
    }

    /**
     * @dev Get total amount of salaries in Payroll
     * @notice Get total amount of salaries in Payroll
     * @return Integer with the amount
     */
    function getYearlyTotalPayroll() public constant auth(OWNER_READ_ROLE) returns(uint256 total) {
        total = yearlyTotalPayroll;
    }

    /**
     * @dev Monthly USD amount spent in salaries
     * @notice Monthly USD amount spent in salaries
     * @return Integer with the monthly amount
     */
    function calculatePayrollBurnrate() public constant auth(OWNER_READ_ROLE) returns(uint256 payrollBurnrate) {
        payrollBurnrate = yearlyTotalPayroll / 12;
    }

    /**
     * @dev Days until the contract can run out of funds
     * @notice Days until the contract can run out of funds
     * @return Integer with the number of days
     */
    function calculatePayrollRunway() public constant auth(OWNER_READ_ROLE) returns(uint256 payrollRunway) {
        if (yearlyTotalPayroll == 0)
            payrollRunway = 2**256 - 1;
        else
            payrollRunway = this.balance.mul(365) / yearlyTotalPayroll;
    }

    /* EMPLOYEE ONLY */
    /**
     * @dev Set token distribution for payments to an employee (the caller)
     * @notice Set token distribution for payments to an employee (the caller).
     *         Only callable once every 6 months
     * @param tokens Array with the tokens to receive, they must belong to allowed tokens for employee
     * @param distribution Array (correlated to tokens) with the proportions (integers over 100)
     */
    function determineAllocation(address[] tokens, uint256[] distribution) public auth(EMPLOYEE_ROLE) {
        var employee = employees[employeeIds[msg.sender]];
        require(getTimestamp() > employee.lastAllocation && getTimestamp() - employee.lastAllocation > 15768000); // half a year in seconds

        // check arrays match
        require(tokens.length == distribution.length);

        // check distribution is right
        uint256 sum = 0;
        uint256 i;
        for (i = 0; i < distribution.length; i++) {
            // check token is allowed
            require(employee.allowedTokens[tokens[i]]);
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
    function getAllocation(address token) public constant auth(EMPLOYEE_ROLE) returns(uint256 allocation) {
        var employee = employees[employeeIds[msg.sender]];
        allocation = employee.allocation[token];
    }

    /**
     * @dev payday To withdraw monthly payment by employee (the caller)
     * @notice Only callable once a month. Assumed token has these standard checks implemented:
     *         https://theethereum.wiki/w/index.php/ERC20_Token_Standard#How_Does_A_Token_Contract_Work.3F
     */
    function payday() public auth(EMPLOYEE_ROLE) {
        var employee = employees[employeeIds[msg.sender]];
        // check that employee exists (and matches)
        require(employee.accountAddress == msg.sender);
        require(getTimestamp() > employee.lastPayroll && getTimestamp() - employee.lastPayroll > 2628000); // 1/12 year in seconds

        // loop over allowed tokens
        bool somethingPaid = false;
        for (uint i = 0; i < employee.allowedTokensArray.length; i++) {
            var token = employee.allowedTokensArray[i];
            if (employee.allocation[token] == 0)
                continue;
            require(checkExchangeRate(token));
            uint256 tokenAmount = employee.yearlyUSDSalary
                .mul(employee.allocation[token]).mul(exchangeRates[token]) / 1200;
            // we could make a recurring payment, but it would change the flow and we should take care of changes in allocation
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
        employee.lastPayroll = getTimestamp();
    }

    /**
     * @dev Change employee account address. To be called by Employer (owner).
     * @notice Change employee account address
     * @param employeeId Employee's identifier
     * @param newAddress New address to receive payments
     */
    function changeAddressByOwner(uint256 employeeId, address newAddress) public auth(OWNER_WRITE_ROLE) {
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
    function changeAddressByEmployee(address newAddress) public auth(EMPLOYEE_ROLE) {
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
     *      In case not, tries to retrieve it from Oracle
     * @param token The token address
     * @return True if we have the exchange rate, false otherwise
     */
    function checkExchangeRate(address token) internal returns(bool) {
        if (exchangeRates[token] == 0) {
            OracleInterface oracleContract = OracleInterface(oracle);
            if (oracleContract.query(this, token)) {
                if (exchangeRates[token] > 0) {
                    return true;
                }
            }
            return false;
        }
        return true;
    }

    function _addEmployeeWithName(
        address accountAddress,
        address[] allowedTokens,
        uint256 initialYearlyUSDSalary,
        string name
    )
        internal
    {
        // check that account doesn't exist
        require(employeeIds[accountAddress] == 0);

        var employeeId = nextEmployee;
        employees[employeeId] = Employee({
            accountAddress: accountAddress,
            allowedTokensArray: allowedTokens,
            yearlyUSDSalary: initialYearlyUSDSalary,
            lastAllocation: 0,
            lastPayroll: 0,
            name: name
        });
        // allowed Tokens
        for (uint i = 0; i < allowedTokens.length; i++) {
            var token = allowedTokens[i];
            employees[employeeId].allowedTokens[token] = true;
            // make sure we have exchange rate
            checkExchangeRate(token);
            // if it's a new one, register it in global Tokens
            if (!globalTokens[token]) {
                globalTokens[token] = true;
                globalTokensArray.push(token);
            }
        }
        // Ids mapping
        employeeIds[accountAddress] = employeeId;
        // update global variables
        yearlyTotalPayroll = yearlyTotalPayroll.add(initialYearlyUSDSalary);
        numEmployees++;
        nextEmployee++;
    }

    function getTimestamp() internal constant returns (uint256) { return now; }

}
