import { format } from 'date-fns'

const YYMMDD_LONG_FORMAT = 'yyyy-MM-dd'

export function formatDate(date, dateFormat = YYMMDD_LONG_FORMAT) {
  return format(date, dateFormat)
}
