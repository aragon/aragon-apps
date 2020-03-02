import { format } from 'date-fns'

export const LOCALE_US_FORMAT = 'en-US'
export const MMDDYY_FORMAT = 'MM/DD/YY'
export const MMDDYY_FUNC_FORMAT = 'MM/dd/yy'

export function formatDate(date) {
  return format(date, MMDDYY_FUNC_FORMAT)
}
