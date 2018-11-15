import { format as dateFormatter } from 'date-fns'
import { round } from './math.utils'

const DEFAULT_DATE_FORMAT = 'LL/dd/yyyy'

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2
})

export const formatCurrency = currencyFormatter.format

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
