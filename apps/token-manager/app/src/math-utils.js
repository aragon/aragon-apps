/**
 * Generic round function, see:
 *  - https://stackoverflow.com/a/18358056/1375656
 *  - https://stackoverflow.com/a/19722641/1375656
 *
 * Fixed for NaNs on really small values
 *
 * @param {number} num Number to round
 * @param {number} places Number of places to round to
 * @param {number} Rounded number
 */
export function round(num, places = 2) {
  const rounded = +(Math.round(num + 'e+' + places) + 'e-' + places)
  return Number.isNaN(rounded) ? 0 : rounded
}

/**
 * Turn a number into a max-length scientific notation form
 *
 * @param {number} Number to transform
 * @param {number} Max string length of number
 * @param {object} [config] Configuration object
 * @param {number} [rounding=0] Number of places to round to
 * @return {string} Number in original or scientific notation
 */
export function sciNot(num, maxLength, { rounding = 0 }) {
  const sciNotPlaceholder = ' * 10^'
  const numStr = num.toString()

  let coefficient
  let expDigits
  if (numStr.indexOf('e+') !== -1) {
    // This number is big enough to be in scientific notation form by default
    ;[coefficient, expDigits] = numStr.split('e+')

    // Cut off the decimals if we need to
    let [sig, decimals] = coefficient.split('.')
    if (decimals.length > rounding) {
      decimals = decimals.slice(0, rounding || 1) // Leave at least one decimal
      coefficient = `${sig}.${decimals}`
    }
  } else {
    const numDigits = numStr.length
    if (numDigits <= maxLength) {
      return numStr
    }

    // Scientific notation text and rounding (along with the .) also takes up space!
    expDigits =
      numDigits - (maxLength - sciNotPlaceholder.length - rounding - 1)
    // Adjust exponent to include its string size (e.g. 100 takes up 3 chars)
    expDigits += expDigits.toString().length

    coefficient = round(num / Math.pow(10, expDigits), rounding)
  }

  return `${coefficient}${sciNotPlaceholder}${expDigits}`
}
