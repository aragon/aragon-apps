import BN from 'bn.js'

// amount: the total amount (BN.js object)
// base: the decimals base (BN.js object)
export function formatBalance(amount, base) {
  const baseLength = base.toString().length

  let fraction = amount.mod(base).toString()
  const zeros = '0'.repeat(Math.max(0, baseLength - fraction.length - 1))
  fraction = `${zeros}${fraction}`
  const whole = amount.div(base).toString()

  return `${whole}${fraction === '0' ? '' : `.${fraction.slice(0, 2)}`}`
}

// Calculates and returns stakes as percentages, adding a “rest” percentage for
// values that are not included.
//
// Params:
//   - amounts: (BN.js array) the amounts to be converted in percentages.
//   - total: (BN.js) the total amount.
//   - maxIncluded: (Number) the max count of items to include in the result.
//
// Returns an array of objects where:
//   - `index` is the original index in `amounts`, or -1 if it’s the “rest”.
//   - `amount` is the original amount provided.
//   - `percentage` is the calculated percentage.
//
export function stakesPercentages(amounts, total, maxIncluded) {
  const hasRest = amounts.length > maxIncluded

  // percentage + two digits (only to sort them by closest to the next integer)
  const pctPrecision = new BN(10000)

  // Calculate the percentages of all the stakes
  const stakes = amounts
    .map((amount, index) => ({ index, amount }))
    .filter(({ amount }) => !amount.isZero())
    .map(stake => ({
      ...stake,
      percentage: stake.amount.mul(pctPrecision).div(total),
    }))
    .sort((a, b) => b.percentage.cmp(a.percentage))

  // convert the percentage back to a number
  const stakePercentageAsNumber = stake => ({
    ...stake,
    percentage: (stake.percentage.toNumber() / pctPrecision.toNumber()) * 100,
  })

  // Add the “Rest” item
  const addRest = (stakes, percentage) => [...stakes, { index: -1, percentage }]

  const addCalculatedRest = stakes =>
    addRest(
      stakes,
      stakes
        .slice(maxIncluded)
        .reduce((total, stake) => total.add(stake.percentage), new BN(0))
    )

  // the stakes to be included (not adjusted yet)
  const includedStakes = (hasRest
    ? addCalculatedRest(stakes.slice(0, maxIncluded))
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
    ? // A “Rest” item already exist, we can remove the 0% items.
      adjustedStakes.slice(0, firstZeroIndex)
    : // A “Rest” item need to be added and can not be zero,
      // so we replace the first non-zero percentage by “Rest”.
      addRest(
        adjustedStakes.slice(0, firstZeroIndex - 1),
        adjustedStakes[firstZeroIndex - 1].percentage
      )
}
