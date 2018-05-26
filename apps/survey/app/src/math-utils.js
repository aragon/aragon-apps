// Get a list of rounded 0 => 100 numbers, from a list of 0 => 1 values.
// If the total of the values is 1, the percentages total will be 100.
export function percentageList(values, digits = 0) {
  const digitsMultiplicator = Math.pow(10, digits)

  if (values.length === 0) {
    return []
  }

  let remaining = 100 * digitsMultiplicator

  // First pass, all numbers are rounded down
  const percentages = values.map(value => {
    const percentage = Math.floor(value * 100 * digitsMultiplicator)
    remaining -= percentage
    return {
      value,
      percentage,
      remain: (value * 100 * digitsMultiplicator) % 1,
    }
  })

  // Add the remaining to the value that is the closest
  // to the next integer, until we reach 100.
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
