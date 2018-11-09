import { format as dateFormatter } from 'date-fns'
import { round } from './math-utils'

const DEFAULT_DATE_FORMAT = 'LL/dd/yyyy'

export function formatDate (date, format = DEFAULT_DATE_FORMAT) {
  return dateFormatter(date, format)
}

export const formatCurrency = (
  amount,
  symbol,
  decimals = 2,
  pow = 18,
  rounding = 2
) =>
  Number(round(amount / Math.pow(pow, decimals), rounding)) + ' ' + symbol
