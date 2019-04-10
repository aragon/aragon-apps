The purpose of the Finance app is to be the central point for keeping track of
income and expenses in an organization, as well as performing payments.

The Finance app is multi-token (plus ether). In order to remove the need of a
trusted prices feed (oracle) for token exchange rate, every token is accounted
on its own for budgeting and period financial statements.

## Definitions

### Accounting period

Accounting periods are the equivalent of financial quarters in traditional
organizations. Their length can be set depending on how the organization wants
to use them.

For every accounting period, a balance (called token statement) for every
transacted token is kept, this balance will be negative if more was spent than
deposited and positive if otherwise.

### Transactions

A transaction records an event in which assets were deposited or spent through
the Finance app. Spend transactions are called 'outgoing transactions' and
deposits 'incoming transactions'. Every transaction occurs in an accounting
period and counts towards its token statement.

Transactions cannot be created directly, they are recorded as the result of an
operation (either a payment being executed or a deposit made).

### Payments

Payments are the construct used for spending using the Finance app. A payment
can be created to happen only once or it can be a recurring payment that will
be performed according to a certain time schedule.

If executing a payment succeeds, it creates an outgoing transaction with a
reference to the payment.

### Budgets

Budgets give the ability to limit how much units of a token can be spent per
Accounting period. Budgets are set in a token per token basis. By default no
token has a budget, which means unlimited spending is allowed.

Once a budget has been set for a token, the Finance app will only allow the
budgeted amount of tokens to be spent for that period.
