import BN from 'bn.js'

/**
 * Get the whole and decimal parts from a number.
 * Trims leading and trailing zeroes.
 *
 * @param {string} num the number
 * @returns {Array<string>} array with the [<whole>, <decimal>] parts of the number
 */
function splitDecimalNumber(num) {
  const [whole = '', dec = ''] = num.split('.')
  return [
    whole.replace(/^0*/, ''), // trim leading zeroes
    dec.replace(/0*$/, ''), // trim trailing zeroes
  ]
}

/**
 * Format a decimal-based number back to a normal number
 *
 * @param {string} num the number
 * @param {number} decimals number of decimal places
 * @param {Object} [options] options object
 * @param {bool} [options.truncate=true] Should the number be truncated to its decimal base
 * @returns {string} formatted number
 */
export function fromDecimals(num, decimals, { truncate = true } = {}) {
  const [whole, dec] = splitDecimalNumber(num)
  if (!whole && !dec) {
    return '0'
  }

  const paddedWhole = whole.padStart(decimals + 1, '0')
  const decimalIndex = paddedWhole.length - decimals
  const wholeWithoutBase = paddedWhole.slice(0, decimalIndex)
  const decWithoutBase = paddedWhole.slice(decimalIndex)

  if (!truncate && dec) {
    // We need to keep all the zeroes in this case
    return `${wholeWithoutBase}.${decWithoutBase}${dec}`
  }

  // Trim any trailing zeroes from the new decimals
  const decWithoutBaseTrimmed = decWithoutBase.replace(/0*$/, '')
  if (decWithoutBaseTrimmed) {
    return `${wholeWithoutBase}.${decWithoutBaseTrimmed}`
  }

  return wholeWithoutBase
}

/**
 * Format the number to be in a given decimal base
 *
 * @param {string} num the number
 * @param {number} decimals number of decimal places
 * @param {Object} [options] options object
 * @param {bool} [options.truncate=true] Should the number be truncated to its decimal base
 * @returns {string} formatted number
 */
export function toDecimals(num, decimals, { truncate = true } = {}) {
  const [whole, dec] = splitDecimalNumber(num)
  if (!whole && !dec) {
    return '0'
  }

  const wholeLengthWithBase = whole.length + decimals
  const withoutDecimals = (whole + dec).padEnd(wholeLengthWithBase, '0')
  const wholeWithBase = withoutDecimals.slice(0, wholeLengthWithBase)

  if (!truncate && wholeWithBase.length < withoutDecimals.length) {
    return `${wholeWithBase}.${withoutDecimals.slice(wholeLengthWithBase)}`
  }
  return wholeWithBase
}

/**
 * Format the balance to a fixed number of decimals
 *
 * @param {BN} amount the total amount
 * @param {BN} base the decimals base
 * @param {number} precision number of decimals to format
 * @return {string} formatted balance
 */
export function formatBalance(amount, base, precision = 2) {
  const baseLength = base.toString().length

  const whole = amount.div(base).toString()
  let fraction = amount.mod(base).toString()
  const zeros = '0'.repeat(Math.max(0, baseLength - fraction.length - 1))
  fraction = `${zeros}${fraction}`.replace(/0+$/, '').slice(0, precision)

  if (fraction === '' || parseInt(fraction, 10) === 0) {
    return whole
  }

  return `${whole}.${fraction}`
}

/**
 * Calculates and returns stakes as percentages, adding a “rest” percentage for
 * values that are not included.
 *
 * @param {Array<BN>} amounts the amounts to be converted in percentages
 * @param {Object} [options] options object
 * @param {BN} [options.total] the total amount, defaults to the sum of the given amounts
 * @param {number} [options.maxIncluded] the max count of items to include in the result, defaults
 *                                       to the length of the given amounts
 * @return {Array<Object>} an array of objects where:
 *   - `index` is the original index in `amounts`, or -1 if it’s the “rest”
 *   - `amount` is the original amount provided
 *   - `percentage` is the calculated percentage, as a number between 0 and 100
 */
export function stakesPercentages(
  amounts,
  { total = new BN(-1), maxIncluded = amounts.length } = {}
) {
  if (total.eqn(-1)) {
    total = amounts.reduce((total, value) => total.add(value), new BN(0))
  }

  // percentage + two digits (only to sort them by closest to the next integer)
  const pctPrecision = 10000

  // Calculate the percentages of all the stakes
  const stakes = amounts
    .filter(amount => !amount.isZero())
    .map((amount, index) => ({
      amount,
      index,
      percentage: amount.muln(pctPrecision).div(total),
    }))
    .sort((a, b) => b.percentage.cmp(a.percentage))

  // convert the percentage back to a number
  const stakePercentageAsNumber = stake => ({
    ...stake,
    percentage: (stake.percentage.toNumber() / pctPrecision) * 100,
  })

  // Add the “Rest” item
  const addRest = (stakes, percentage) => [...stakes, { index: -1, percentage }]

  const addCalculatedRest = (includedStakes, excludedStakes) =>
    addRest(
      includedStakes,
      excludedStakes.reduce(
        (total, stake) => total.add(stake.percentage),
        new BN(0)
      )
    )

  const hasRest = amounts.length > maxIncluded

  // the stakes to be included (not adjusted yet)
  const includedStakes = (hasRest
    ? addCalculatedRest(
        stakes.slice(0, maxIncluded - 1),
        stakes.slice(maxIncluded - 1)
      )
    : stakes
  ).map(stakePercentageAsNumber)

  // Round to the next integer some stake percentages until we get to 100%.
  // Start with the percentages that are the closest to the next integer.
  const missingPct = includedStakes.reduce(
    (total, stake) => total - Math.floor(stake.percentage),
    100
  )
  const stakesToAdjust = includedStakes
    .map((stake, index) => [index, stake.percentage])
    .sort((a, b) => (b[1] % 1) - (a[1] % 1))
    .slice(0, missingPct)
    .map(([index]) => index)

  const adjustStakePercentage = (stake, index) => ({
    ...stake,
    percentage: (stakesToAdjust.includes(index) ? Math.ceil : Math.floor)(
      stake.percentage
    ),
  })

  const adjustedStakes = includedStakes.map(adjustStakePercentage)

  // Check if there is any 0% item in the list
  const firstZeroIndex = adjustedStakes.findIndex(
    ({ percentage }) => percentage === 0
  )

  if (firstZeroIndex === -1) {
    return adjustedStakes
  }

  // Remove the 0% items and group them in a “Rest” item.
  return hasRest
    ? // A “Rest” item already exists, we can remove the 0% items.
      adjustedStakes.slice(0, firstZeroIndex)
    : // A “Rest” item needs to be added and can not be zero,
      // so we replace the first non-zero percentage by “Rest”.
      addRest(
        adjustedStakes.slice(0, firstZeroIndex - 1),
        adjustedStakes[firstZeroIndex - 1].percentage
      )
}
