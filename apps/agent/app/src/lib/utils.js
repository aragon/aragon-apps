import { round } from './math-utils'
import { LOCALE_US_FORMAT } from './locales'

export const ROUNDING_AMOUNT = 5

export function noop() {}

export function formatDecimals(value, digits) {
  try {
    return value.toLocaleString(LOCALE_US_FORMAT, {
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
  return (
    (displaySign ? (isIncoming ? '+' : '-') : '') +
    formatDecimals(round(amount / Math.pow(10, decimals), rounding), 18)
  )
}
