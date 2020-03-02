import { format } from 'date-fns'

export const LOCALE_US_FORMAT = 'en-US'
export const MMDDYY_FORMAT = 'MM/DD/YY'

export function formatDate(date) {
  return format(date, MMDDYY_FORMAT)
}
