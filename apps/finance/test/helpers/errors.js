const { makeErrorMappingProxy } = require('@aragon/contract-helpers-test')

module.exports = makeErrorMappingProxy({
  // aragonOS errors
  APP_AUTH_FAILED: 'APP_AUTH_FAILED',
  INIT_ALREADY_INITIALIZED: 'INIT_ALREADY_INITIALIZED',
  INIT_NOT_INITIALIZED: 'INIT_NOT_INITIALIZED',
  RECOVER_DISALLOWED: 'RECOVER_DISALLOWED',

  // Vault errors
  VAULT_TOKEN_TRANSFER_REVERTED: 'VAULT_TOKEN_TRANSFER_REVERTED',

  // Finance errors
  FINANCE_BUDGET: 'FINANCE_BUDGET',
  FINANCE_COMPLETE_TRANSITION: 'FINANCE_COMPLETE_TRANSITION',
  FINANCE_DEPOSIT_AMOUNT_ZERO: 'FINANCE_DEPOSIT_AMOUNT_ZERO',
  FINANCE_ETH_VALUE_MISMATCH: 'FINANCE_ETH_VALUE_MISMATCH',
  FINANCE_EXECUTE_PAYMENT_NUM: 'FINANCE_EXECUTE_PAYMENT_NUM',
  FINANCE_EXECUTE_PAYMENT_TIME: 'FINANCE_EXECUTE_PAYMENT_TIME',
  FINANCE_SET_PERIOD_TOO_SHORT: 'FINANCE_SET_PERIOD_TOO_SHORT',
  FINANCE_NEW_PAYMENT_AMOUNT_ZERO: 'FINANCE_NEW_PAYMENT_AMOUNT_ZERO',
  FINANCE_NEW_PAYMENT_EXECS_ZERO: 'FINANCE_NEW_PAYMENT_EXECS_ZERO',
  FINANCE_NEW_PAYMENT_IMMEDIATE: 'FINANCE_NEW_PAYMENT_IMMEDIATE',
  FINANCE_NEW_PAYMENT_INTRVL_ZERO: 'FINANCE_NEW_PAYMENT_INTRVL_ZERO',
  FINANCE_NO_SCHEDULED_PAYMENT: 'FINANCE_NO_SCHEDULED_PAYMENT',
  FINANCE_NO_PERIOD: 'FINANCE_NO_PERIOD',
  FINANCE_NO_TRANSACTION: 'FINANCE_NO_TRANSACTION',
  FINANCE_PAYMENT_INACTIVE: 'FINANCE_PAYMENT_INACTIVE',
  FINANCE_PAYMENT_RECEIVER: 'FINANCE_PAYMENT_RECEIVER',
  FINANCE_RECOVER_AMOUNT_ZERO: 'FINANCE_RECOVER_AMOUNT_ZERO',
  FINANCE_REMAINING_BUDGET: 'FINANCE_REMAINING_BUDGET',
  FINANCE_VAULT_NOT_CONTRACT: 'FINANCE_VAULT_NOT_CONTRACT',
})
