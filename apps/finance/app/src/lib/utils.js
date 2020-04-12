import BN from 'bn.js'
import { round } from './math-utils'

export function formatDecimals(value, digits) {
  try {
    return value.toLocaleString('latn', {
      style: 'decimal',
      maximumFractionDigits: digits,
    })
  } catch (err) {
    if (err.name === 'RangeError') {
      // Fallback to Number.prototype.toString()
      // if the language tag is not supported.
      return value.toString()
    }
    throw err
  }
}

export function formatTokenAmount(
  amount,
  isIncoming,
  decimals = 0,
  displaySign = false,
  { rounding = 2 } = {}
) {
  const formattedAmount = BN.isBN(amount)
    ? formatAmountBN(amount, decimals, rounding)
    : formatDecimals(round(amount / Math.pow(10, decimals), rounding), 18)

  return (displaySign ? (isIncoming ? '+' : '-') : '') + formattedAmount
}

function formatAmountBN(amount, decimals, rounding) {
  const amountBN = new BN(amount)
  const decimalBase = new BN(10).pow(new BN(decimals)) // 10e(decimals)

  // Split into integer and fractional parts
  const intAmount = amountBN.div(decimalBase).toString()
  const fractionAmount = amountBN.mod(decimalBase)

  const roundedFractionAmount = roundFractionAmountBN(
    fractionAmount,
    decimals,
    rounding
  )

  return `${intAmount}${
    roundedFractionAmount ? `.${roundedFractionAmount}` : ''
  }`
}

function roundFractionAmountBN(amount, decimals, rounding) {
  const decimalBaseRounding = new BN(10).pow(new BN(decimals - rounding))

  // Apply rounding
  const roundedFractionAmount = amount.divRound(decimalBaseRounding)

  // Add leading zeros
  const paddedFractionAmount = !roundedFractionAmount.isZero()
    ? roundedFractionAmount.toString().padStart(rounding, '0')
    : ''

  // Remove trailing zeros
  return paddedFractionAmount.replace(/^(\d*?)(0*?)$/, '$1')
}
