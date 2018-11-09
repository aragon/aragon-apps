import { format as dateFormatter } from 'date-fns'
import { round } from './math-utils'

const DEFAULT_DATE_FORMAT = 'LL/dd/yyyy'

export const SECONDS_IN_A_YEAR = 31557600 // 365.25 days

export function formatDate (date, format = DEFAULT_DATE_FORMAT) {
  return dateFormatter(date, format)
}

export function formatCurrency (
  amount,
  symbol,
  decimals = 10,
  pow = 18,
  rounding = 2
) {
  return round(((amount / Math.pow(decimals, pow)) * SECONDS_IN_A_YEAR), 2) + ' ' + symbol
}
