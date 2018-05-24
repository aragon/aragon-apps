# [Payroll](https://github.com/aragon/aragon-apps/tree/master/future-apps/payroll)

_**Code in Github:**_ [aragon-apps/apps/payroll](https://github.com/aragon/aragon-apps/tree/master/future-apps/payroll)

The purpose of the Payroll app is to implement a Payroll system in multiple currencies.

### Initialization

Initializing a Payroll app requires the following parameters:

- **Finance**: a reference to [Finance](https://github.com/aragon/aragon-apps/tree/master/apps/finance) instance that Payroll app will use to pay salaries. Finance in turn will use [Vault](https://github.com/aragon/aragon-apps/tree/master/apps/vault) to access funds, but going through Finance will have everything properly accounted for.
- **Ether Token**: EtherToken instance used as ether.
- **Denomination Token**: token used to denominate salaries. All exchange rates for other tokens will be paired with it.

### Lifecycle

#### Add allowed token
```
payroll.addAllowedToken(address _allowedToken)
```
Add token to the list of accepted ones for salary payment. It needs `ALLOWED_TOKEN_MANAGER_ROLE`.

#### Set exchange rate
```
payroll.setExchangeRate(address token, uint256 denominationExchangeRate)
```
Set the exchange rate for an allowed token against the Payroll denomination token. It needs `ORACLE_ROLE`.

#### Add employee
Three options can be used:
```
payroll.addEmployee(address accountAddress, uint256 initialYearlyDenominationSalary)
payroll.addEmployeeWithName(address accountAddress, uint256 initialYearlyDenominationSalary, string name)
payroll.addEmployeeWithNameAndStartDate(address accountAddress, uint256 initialYearlyDenominationSalary, string name, uint256 startDate)
```
Add employee to the organization. Start date is used as the initial payment day. If it's not provided, the date of the transaction will be used. It needs `ADD_EMPLOYEE_ROLE`.

#### Modify employee salary
```
payroll.setEmployeeSalary(uint128 employeeId, uint256 yearlyDenominationSalary)
```
It needs `ADD_EMPLOYEE_ROLE`.

#### Remove employee
```
payroll.removeEmployee(uint128 employeeId)
```
Remove employee from organization. The owed up to current date salary will be transferred to the employee. It needs `REMOVE_EMPLOYEE_ROLE`.

#### Determine allocation
```
payroll.determineAllocation(address[] tokens, uint8[] distribution)
```
Employees can set the proportion of every allowed token that want to be used for their salary payment. Distribution values are expressed as a ratio to 100.

#### Request payroll
```
payroll.payday()
```
Employees can request payroll whenever they want and the proportional amount of their anual salary since the last request (or since the start date if it's the first one) will be transferred.

#### Change account address
```
payroll.changeAddressByEmployee(address newAddress)
```
Employees can change their own address.

### Limitations

- Allowed tokens can not be removed right now. It wouldn't be trivial, as employees should be notified and they should modifiy their allocation.
- If an employee requests payroll having allocated an allowed token which doesn't have an exchange rate, the transaction will fail. In other words, exchange rates must be set before employees try to use those tokens for their payrolls.
- Exchange rate is not updated automatically. So it could happen that rates are outated when payrolls are requested. An external mechanism for updating rates often should be implemented.
- If there are not enough funds for a given token, `payday` will fail. There's no automatic token conversion yet.
