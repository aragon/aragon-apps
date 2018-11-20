import { format as dateFormatter } from 'date-fns'
import { round } from './math-utils'

const DEFAULT_DATE_FORMAT = 'LL/dd/yyyy'

export const SECONDS_IN_A_YEAR = 31557600 // 365.25 days

export function formatDate (date, format = DEFAULT_DATE_FORMAT) {
  return dateFormatter(date, format)
}

export const formatTokenAmount = ({
  amount,
  isIncoming,
  decimals = 0,
  displaySign = false,
  rounding = 2
}) =>
  (displaySign ? (isIncoming ? '+' : '-') : '') +
  Number(round(amount / Math.pow(10, decimals), rounding)).toLocaleString(
    'latn',
    {
      style: 'decimal',
      maximumFractionDigits: 18
    }
  )

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0
})

export function formatCurrency (
  amount,
  symbol,
  decimals = 10,
  pow = 18,
  multiplier = 1,
  rounding = 2
) {
  const number = round(((amount / Math.pow(decimals, pow)) * multiplier), rounding)
  const formattedNumber = formatter.format(number)
  return `${formattedNumber} ${symbol}`
}
