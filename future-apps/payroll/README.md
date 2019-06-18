# Payroll

An automated employee payroll system featuring real-time salaries in multiple tokens.

## Capabilities

The Payroll app defines the following roles:

- `ADD_EMPLOYEE_ROLE`: allows invocation of `addEmployee()`
- `TERMINATE_EMPLOYEE_ROLE`: allows invocation of `terminateEmployee()`
- `SET_EMPLOYEE_SALARY_ROLE`: allows invocation of `setEmployeeSalary()`
- `ADD_BONUS_ROLE`: allows invocation of `addBonus()`
- `ADD_REIMBURSEMENT_ROLE`: allows invocation of `addReimbursement()`
- `ALLOWED_TOKENS_MANAGER_ROLE`: allows invocation of `addAllowedToken()`
- `CHANGE_PRICE_FEED_ROLE`: allows invocation of `setPriceFeed()`
- `MODIFY_RATE_EXPIRY_ROLE`: allows invocation of `setRateExpiryTime()`

These roles can all be considered "management" roles, in that they are sensitive and meant to be held by more privileged members or apps in the organization. In particular, the set of `ADD_EMPLOYEE_ROLE`, `TERMINATE_EMPLOYEE_ROLE`, `SET_EMPLOYEE_SALARY_ROLE`, `ADD_BONUS_ROLE`, and `ADD_REIMBURSEMENT_ROLE` roles control functionality related to managing employees and their salaries, and the set of `ALLOWED_TOKENS_MANAGER_ROLE`, `CHANGE_PRICE_FEED_ROLE`, `MODIFY_RATE_EXPIRY_ROLE` roles control specific parameters and configuration points in how the Payroll app operates as a whole.

Employees themselves are authenticated based on their "employee account" (an address), and have access to functionality related to their account that only they are allowed to access:

- `changeAddressByEmployee()`
- `determineAllocation()`
- `payday()`

### Payroll management

The Payroll app is [initialized](#initialization) with four parameters:

- **Finance**: a reference to a [Finance](https://github.com/aragon/aragon-apps/tree/master/apps/finance) instance that will be used to make payments
  - Finance in turn will use a [Vault](https://github.com/aragon/aragon-apps/tree/master/apps/vault) to access funds, but having the Payroll app use a Finance app allows salary payments to record more obvious transactions in the organization's UI
- **Denomination token**: ["base"](https://www.investopedia.com/terms/b/basecurrency.asp) token used to denominate all salaries in this Payroll instance
  - This denomination token may not be a real on-chain currency (depends on how the linked price feed is implemented and if the denomination token is allowed to be used as a salary token)
- **Price feed**: [`IFeed`](https://github.com/aragon/ppf/blob/master/packages/ppf-contracts/) implementation that provides exchange rates between different tokens
  - May include exchange rates to/from "phantom" tokens, to mimic off-chain currencies (e.g. USD)
- **Price feed expiration time**: Maximum latency allowed between an exchange rate's last update in the Price Feed and its actual use

The price feed and expiration time can be later modified by `setPriceFeed()` and `setRateExpiryTime()`, respectively.

In addition to the instantiation options, Payroll managers must also use `addAllowedToken()` to whitelist a set of tokens that will be provided as options for employees to withdraw their salaries in.

> **Note**: we initially recommend only using ETH (`0x00...00`) or DAI (`0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359`) as the denomination token.
>
> Using the wrong denomination token _can_ have **dangerous** consequences. Understand the [requirements for allowed tokens in the potentially dangerous gotchas section](#requirements-for-allowed-and-denomination-tokens) if you're considering using another token.
>
> **Note**: for similar reasons, we also recommend only whitelisting ETH or DAI as the allowed
> tokens. You cannot yet revoke any allowed tokens.

### Employee management

### Employee actions

## Example lifecycle

### Payroll manager

1. **Installation**

Install an instance of the Payroll app onto the organization, and set up permissions in accordance to the governance structure desired.

For simplicity, we assume that all of the functionality discussed below can be achieved in one way or another (either one person directly holds the permission, or can access the functionality behind a forwarder).

2. **Initialization**

Initializing a Payroll app requires the following parameters:

- Finance
- Denomination token
- Price feed
- Price feed rate expiry time

See [Payroll management](#payroll-management) for more information on these specific parameters.

We assume the Payroll app has been instantiated using a Finance app installed onto the same organization and an already deployed price feed, using DAI as the denomination token and 10 minutes as the price feed rate expiry limit:

```
payroll.initialize(0xabc...def, 0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359, 0xabc...def, 600);
```

3. **Add allowed tokens**

Add ETH and DAI as allowed tokens for salary withdrawl:

```
payroll.addAllowedToken(0x0000000000000000000000000000000000000000); // ETH
payroll.addAllowedToken(0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359); // DAI
```

4. **Add employee**

Add an employee starting on Jan. 1st, 2020, with 80,000 DAI salary (note the salary is in seconds, and already adjusted for 18 decimals):

```
payroll.addEmployee(0xabc...def, 2535047025122317, 1577836800, "employee");
```

Assume for future examples this employee has an employee ID of `1`.

5. **Modify employee salary**

After some time, give the employee a raise by changing their salary to 90,000 DAI:

```
payroll.setEmployeeSalary(1, 2851927903262606);
```

6. **Terminate employee**

Finally, remove the employee from payroll on Jan. 1, 2022:

```
payroll.terminateEmployee(1, 1640995200);
```

### Employee

1. **Determine allocation**

```
payroll.determineAllocation(address[] tokens, uint8[] distribution)
```

Employees can set the proportion of every allowed token that want to be used for their salary payment. Distribution values are expressed as a ratio to 100.

2. **Request payroll**

```
payroll.payday()
```

Employees can request payroll whenever they want and the proportional amount of their anual salary since the last request (or since the start date if it's the first one) will be transferred.

3. **Change account address**

```
payroll.changeAddressByEmployee(address newAddress)
```

Employees can change their own address.

4. **Claim final paycheck after termination**

```
payroll.payday()
```

## :warning: Gotchas to be aware of / potentially dangerous limitations

### Requirements For allowed and denomination tokens

Due to the limits of mathematical precision, any token used as either the denonination token or an allowed token must have a "reasonable" exchange rate against all other allowed or denomination tokens and this exchange rate must be fetchable from the price feed.

A "resonable" exchange rate is one that falls between 1e-18 and 1e18 against a base token.

### Lack of budget or funds

`payday()` fails if one of the token payments exceeds the budget left in the Finance app or the Vault's balance for that token. Even if the Vault could technically pay out the salary by converting its assets appropriately, no automatic conversions are attempted.

**Denial-of-service**: as salaries are not held in escrow, an organization could strategically transfer funds or move them into different accounts to deny employees' salaries.

**Frontrunning**: in the event where the Finance app is not able to pay everyone's salary, only the first ones able to execute `payday()` will be paid.

### Inaccurate maths

Due to the nature of exchange rates and running imprecise arithmetic operations, a user's actual, paid salary will differ slightly from their "real" salary. In all cases though, these rounding errors should be so ridiculuosly small as to not present a problem in reality.

### Avoiding denial of service from large numbers

`addBonus()`, `addReimbursement()`, and `setEmployeeSalary()` are all management-related
functionality which set storage variables on an employee's account that are later used in
calculating payments.

In particular, inputting a large number in any of these functions can create a denial of service situation for an employee when they later attempt to access `payday()`, due to some calculations throwing on overflow errors.

As a mitigation, `payday()` includes the ability to do _partial_ paydays with the `_requestedAmount` input field, allowing a user to specify that they only want to be paid up to a certain amount. If the employee is ever in a situation where their owed salary, bonus, or reimbursements become so high as to cause overflows, they will always have the option to request a smaller amount that doesn't overflow.

### Losing one second of pay when using partial payments

Executing a partial `payday()` may result in the employee losing up to one second of their "real"
payroll, due to the inability for the EVM to operate in timespans less than one second.

## Non-dangerous limitations

- Allowed tokens cannot be removed. This wouldn't be a trivial operation, as employees' existing token allocations would need to be modified or reset.
- Re-adding a terminated employee results in a new employee ID for that employee. The contract treats them as if they were a completely new employee.
