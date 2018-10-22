import { format as dateFormatter } from 'date-fns'

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
