// amount: the total amount (BN.js object)
// base: the decimals base (BN.js object)
export function formatBalance(amount, base) {
  const baseLength = base.toString().length

  let fraction = amount.mod(base).toString()
  const zeros = '0'.repeat(Math.max(0, baseLength - fraction.length - 1))
  fraction = `${zeros}${fraction}`
  const whole = amount.div(base).toString()

  return `${whole}${fraction === '0' ? '' : `.${fraction.slice(0, 2)}`}`
}
