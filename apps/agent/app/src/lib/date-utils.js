import { format } from 'date-fns'

export const MMDDYY_FORMAT = 'MM/DD/YY'
export const MMDDYY_FUNC_FORMAT = 'MM/dd/yy'
export const ISO_FORMAT = "yyyy-MM-dd'T'HH:mm:ss"
export const ISO_SHORT_FORMAT = 'yyyy-MM-dd'

export function formatDate(date) {
  return format(date, MMDDYY_FUNC_FORMAT)
}
