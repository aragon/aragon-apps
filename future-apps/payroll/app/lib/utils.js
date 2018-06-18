import { round } from './math-utils'

export const formatTokenAmount = (
  amount,
  isIncoming,
  decimals = 0,
  displaySign = false,
  { rounding = 2 } = {}
) =>
  (displaySign ? (isIncoming ? '+' : '-') : '') +
  Number(round(amount / Math.pow(10, decimals), rounding)).toLocaleString(
    'latn',
    {
      style: 'decimal',
      maximumFractionDigits: 18,
    }
  )
