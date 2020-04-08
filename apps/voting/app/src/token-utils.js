export async function getUserBalanceAt(
  connectedAccount,
  snapshotBlock,
  tokenContract
) {
  if (!tokenContract || !connectedAccount) {
    return -1
  }

  const balance = await tokenContract
    .balanceOfAt(connectedAccount, snapshotBlock)
    .toPromise()

  return balance
}

export async function getUserBalanceNow(
  connectedAccount,
  tokenContract,
  tokenDecimals
) {
  if (!tokenContract || !connectedAccount) {
    return -1
  }

  const balance = await tokenContract.balanceOf(connectedAccount).toPromise()

  return Math.floor(parseInt(balance, 10) / Math.pow(10, tokenDecimals))
}

/**
 * Format the balance to a fixed number of decimals
 *
 * @param {BN} amount the total amount
 * @param {BN} base the decimals base
 * @param {number} precision number of decimals to format
 * @return {string} formatted balance
 */
export function formatBalance(amount, base, precision = 2) {
  const baseLength = base.toString().length

  const whole = amount.div(base).toString()
  let fraction = amount.mod(base).toString()
  const zeros = '0'.repeat(Math.max(0, baseLength - fraction.length - 1))
  fraction = `${zeros}${fraction}`.replace(/0+$/, '').slice(0, precision)

  if (fraction === '' || parseInt(fraction, 10) === 0) {
    return whole
  }

  return `${whole}.${fraction}`
}