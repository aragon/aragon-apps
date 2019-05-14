export const PAYMENT_SALARY = Symbol('PAYMENT_SALARY')
export const PAYMENT_BONUS = Symbol('PAYMENT_BONUS')
export const PAYMENT_REIMBURSEMENT = Symbol('PAYMENT_REIMBURSEMENT')

// Enums are not supported by the ABI yet:
// https://solidity.readthedocs.io/en/latest/frequently-asked-questions.html#if-i-return-an-enum-i-only-get-integer-values-in-web3-js-how-to-get-the-named-values
const paymentEnumMap = new Map([
  [PAYMENT_SALARY, 0],
  [PAYMENT_BONUS, 1],
  [PAYMENT_REIMBURSEMENT, 2],
])
export function enumFromPaymentType(paymentType) {
  return paymentEnumMap.get(paymentType)
}
