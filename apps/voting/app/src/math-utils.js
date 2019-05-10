import BN from 'bn.js'

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

  const exponentialIndex = numString.indexOf('e+')
  const numWithoutExponents =
    exponentialIndex > -1 ? numString.substring(0, exponentialIndex) : numString

  const [whole, decimal = ''] = numWithoutExponents.split('.')
  const trimmedDecimals = truncate ? decimal.replace(/0+$/, '') : decimals
  const formattedNumber = trimmedDecimals.length
    ? `${whole}.${
        trimmedDecimals.length > decimals
          ? trimmedDecimals.slice(0, decimals)
          : trimmedDecimals
      }`
    : whole

  // If we were dealing with a yuge number, append the exponent suffix back
  return exponentialIndex > -1
    ? `${formattedNumber}${numString.substring(exponentialIndex)}`
    : formattedNumber
}

export function percentageList(values, digits = 0) {
  return scaleBNValuesSet(values).map(value => value.toNumber())
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

// Scale to `total` a set of values summing to 1.
// Note that the accuracy of `values` is constrained to a set amount of decimals, as BN.js doesn't
// support decimal operations
export function scaleBNValuesSet(
  values = [],
  numTotal = 100,
  correctionLimit = 0.001
) {
  const total = new BN(numTotal)
  const VALUES_ACCURACY_PLACES = 5
  const VALUES_ACCURACY_ADJUSTER = Math.pow(10, VALUES_ACCURACY_PLACES)
  const BN_VALUES_ACCURACY_ADJUSTER = new BN(VALUES_ACCURACY_ADJUSTER)

  function highestValueIndex(values) {
    return values
      .map((value, index) => ({ value, index }))
      .sort((v1, v2) => v2.value - v1.value)[0].index
  }

  if (values.length === 0) {
    return []
  }

  // Adjust values for accepted accuracy
  values = values.map(
    value =>
      Math.floor(value * VALUES_ACCURACY_ADJUSTER) / VALUES_ACCURACY_ADJUSTER
  )

  const accumulatedTotal = values.reduce((total, v) => v + total, 0)
  if (accumulatedTotal < 0) {
    throw new Error('The sum of the values has to be a positive number.')
  }
  if (accumulatedTotal - correctionLimit > 1) {
    throw new Error('The sum of the values has to be equal to or less than 1.')
  }

  // Get the difference to correct
  const valuesCorrection = 1 - accumulatedTotal

  const shouldCorrect =
    valuesCorrection !== 0 &&
    // Negative & out of limit have already thrown at this point,
    // so we should correct if it’s below the correction limit.
    valuesCorrection <= correctionLimit

  // We always correct (up or down) the highest value
  const correctionIndex = shouldCorrect ? highestValueIndex(values) : -1
  if (correctionIndex > -1) {
    values[correctionIndex] = values[correctionIndex] + valuesCorrection
  }

  // Track remaining so we can adjust later on
  let remaining = total.clone()

  // First pass, all numbers are rounded down
  const scaledValues = values.map(value => {
    const scaledValueAdjusted = total.mul(
      new BN(value * VALUES_ACCURACY_ADJUSTER)
    )
    const scaledValue = scaledValueAdjusted.div(BN_VALUES_ACCURACY_ADJUSTER)

    // Get the remaining amount in non-adjusted decimals
    const remain =
      scaledValueAdjusted.mod(BN_VALUES_ACCURACY_ADJUSTER).toNumber() /
      VALUES_ACCURACY_ADJUSTER

    remaining = remaining.sub(scaledValue)

    return {
      value,
      scaledValue,
      remain,
    }
  })

  // Add the remaining to the value that is the closest
  // to the next integer, until we reach `total`.
  let index = -1
  while (remaining.gt(new BN(0))) {
    index = highestValueIndex(scaledValues.map(({ remain }) => remain))

    // The total of the values is not 1, we can stop adjusting here
    if (scaledValues[index].remain === 0) {
      break
    }

    scaledValues[index].scaledValue = scaledValues[index].scaledValue.add(
      new BN(1)
    )
    scaledValues[index].remain = 0

    remaining = remaining.sub(new BN(1))
  }

  return scaledValues.map(p => p.scaledValue)
}
