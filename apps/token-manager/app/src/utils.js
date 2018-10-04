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

  // Add the rest item if needed
  const addRestIfNeeded = stakes =>
    hasRest
      ? stakes.slice(0, maxIncluded).concat([
          {
            index: -1,
            percentage: stakes
              .slice(maxIncluded)
              .reduce((total, stake) => total.add(stake.percentage), new BN(0)),
          },
        ])
      : stakes

  // convert the percentage back to a number
  const stakePercentageAsNumber = stake => ({
    ...stake,
    percentage: (stake.percentage.toNumber() / pctPrecision.toNumber()) * 100,
  })

  // the stakes to be included (not adjusted yet)
  const includedStakes = addRestIfNeeded(stakes).map(stakePercentageAsNumber)

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

  return includedStakes.map(adjustStakePercentage)
}
