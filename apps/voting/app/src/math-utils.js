/**
 * Format numbers for a given number of decimal places
 *
 * @param {number} num Number to round
 * @param {number} [decimals=2] Number of decimals to round to
 * @param {Object} [options] Options object
 * @param {bool} [options.truncate=true] Whether to truncate the trailing decimals (if they're 0)
 * @returns {String} Formatted number
 */
export function formatNumber(num, decimals = 2, { truncate = true } = {}) {
  const multiplicator = Math.pow(10, decimals)
  const roundedNum = Math.round(num * multiplicator) / multiplicator
  const numString = String(roundedNum)

  if (!decimals) {
    return numString
  }

  const [whole, decimal = ''] = numString.split('.')
  const trimmedDecimals = truncate ? decimal.replace(/0+$/, '') : decimals
  return trimmedDecimals.length
    ? `${whole}.${
        trimmedDecimals.length > decimals
          ? trimmedDecimals.slice(0, decimals)
          : trimmedDecimals
      }`
    : whole
}

export function percentageList(values, digits = 0) {
  return scaleValuesSet(values, digits)
}

/**
 * Generic round function, see:
 *  - https://stackoverflow.com/a/18358056/1375656
 *  - https://stackoverflow.com/a/19722641/1375656
 *
 * Fixed for NaNs on really small values
 *
 * @param {number} num Number to round
 * @param {number} [decimals=2] Number of decimals to round to
 * @returns {number} Rounded number
 */
export function round(num, decimals = 2) {
  const rounded = Number(Math.round(num + 'e+' + decimals) + 'e-' + decimals)
  return Number.isNaN(rounded) ? Number(num.toFixed(decimals)) : rounded
}

// Return 0 if denominator is 0 to avoid NaNs
export function safeDiv(num, denom) {
  return denom ? num / denom : 0
}

// Get a list of rounded 0 => `total` numbers, from a list of 0 => 1 values.
// If the total of the values is exactly 1, the total of the resulting values
// will be exactly `total`.
export function scaleValuesSet(values, digits = 0, total = 100) {
  const digitsMultiplicator = Math.pow(10, digits)

  if (values.length === 0) {
    return []
  }

  let remaining = total * digitsMultiplicator

  // First pass, all numbers are rounded down
  const percentages = values.map(value => {
    const percentage = Math.floor(value * total * digitsMultiplicator)
    remaining -= percentage
    return {
      percentage,
      remain: (value * total * digitsMultiplicator) % 1,
    }
  })

  // Add the remaining to the value that is the closest
  // to the next integer, until we reach `total`.
  let index = -1
  while (remaining--) {
    index = percentages
      .map(({ remain }, index) => ({ remain, index }))
      .sort((p1, p2) => p2.remain - p1.remain)[0].index

    // The total of the values is not 1, we stop adjusting here
    if (percentages[index].remain === 0) {
      break
    }

    percentages[index].percentage += 1
    percentages[index].remain = 0
  }

  return percentages.map(p => p.percentage / digitsMultiplicator)
}
