export function formatDecimals(value, digits) {
  try {
    return value.toLocaleString('latn', {
      style: 'decimal',
      maximumFractionDigits: digits,
    })
  } catch (err) {
    if (err.name === 'RangeError') {
      // Fallback to Number.prototype.toString()
      // if the language tag is not supported.
      return value.toString()
    }
    throw err
  }
}

export function formatTokenAmount(
  amount,
  isIncoming,
  decimals = 0,
  displaySign = false,
  { rounding = 2 } = {}
) {
  return (
    (displaySign ? (isIncoming ? '+' : '-') : '') +
    formatDecimals(round(amount / Math.pow(10, decimals), rounding), 18)
  )
}

/**
 * Generic round function, see:
 *  - https://stackoverflow.com/a/18358056/1375656
 *  - https://stackoverflow.com/a/19722641/1375656
 *
 * Fixed for NaNs on really small values
 *
 * @param {number} num Number to round
 * @param {number} [places=2] Number of places to round to
 * @returns {number} Rounded number
 */
export function round(num, places = 2) {
  const rounded = Number(Math.round(num + 'e+' + places) + 'e-' + places)
  return Number.isNaN(rounded) ? Number(num.toFixed(places)) : rounded
}

export function toHours(ms) {
  return ms / 3600000
}

/**
 * Format time to HH:MM:SS
 *
 * @param {number} time the time in seconds
 * @returns {string} formatted time
 */
export function formatTime(time) {
  const dayInSeconds = 86400
  const hourInSeconds = 3600
  const minuteInSeconds = 60
  const units = ['d', 'h', 'm', 's']

  const days = Math.floor(time / dayInSeconds)
  const hours = Math.floor((time % dayInSeconds) / hourInSeconds)
  const minutes = Math.floor(((time % dayInSeconds) % hourInSeconds) / minuteInSeconds)
  const seconds = ((time % dayInSeconds) % hourInSeconds) % minuteInSeconds

  return [days, hours, minutes, seconds]
    .map((elem, index) => (elem > 0 ? `${elem}${units[index]} ` : ''))
    .join('')
}
