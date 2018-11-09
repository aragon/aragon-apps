import { format as dateFormatter } from 'date-fns'
import { round } from './math-utils'

const DEFAULT_DATE_FORMAT = 'LL/dd/yyyy'

export const SECONDS_IN_A_YEAR = 31557600 // 365.25 days

export function formatDate (date, format = DEFAULT_DATE_FORMAT) {
  return dateFormatter(date, format)
}

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0
})

export function formatCurrency (
  amount,
  symbol,
  decimals = 10,
  pow = 18,
  rounding = 2
) {
  const number = round(((amount / Math.pow(decimals, pow)) * SECONDS_IN_A_YEAR), rounding)
  const formattedNumber = formatter.format(number)
  return  `${formattedNumber} ${symbol}`
}
