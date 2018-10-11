// Return 0 if denominator is 0 to avoid NaNs
export function safeDiv(num, denom) {
  return denom ? num / denom : 0
}

export function percentageList(values, digits = 0) {
  return scaleValuesSet(values, digits)
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
      value,
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
