import { round } from './math-utils'

export const formatTokenAmount = (
  amount,
  decimals = 0,
  displaySign = false,
  { rounding = 2 } = {}
) =>
  (displaySign && amount > 0 ? '+' : '') +
  Number(round(amount / Math.pow(10, decimals), rounding)).toLocaleString(
    'latn',
    {
      style: 'decimal',
      maximumFractionDigits: 18,
    }
  )
