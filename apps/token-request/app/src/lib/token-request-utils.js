import { hoursToMs } from '../lib/math-utils'

export const hasExpired = (date, now, expireTime) => {
  const expirationDate = new Date(date + hoursToMs(expireTime))
  return now >= expirationDate
}
