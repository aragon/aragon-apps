import { format } from 'date-fns'

export const MMDDYY_FUNC_FORMAT = 'MM/dd/yy'
export const YYMMDD_LONG_FORMAT = 'yyyy-MM-dd'

export function formatDate(date) {
  return format(date, MMDDYY_FUNC_FORMAT)
}
