import BigNumber from 'bignumber.js'

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

function highestValueIndex(values) {
  return values
    .map((value, index) => ({ value, index }))
    .sort((v1, v2) => v2.value.minus(v1.value))[0].index
}

// Scale a set of 0 => 1 values to equal `total`.
export function scaleBigNumberValuesSet(
  values = [],
  total = new BigNumber(100)
) {
  if (values.length === 0) {
    return []
  }

  values = values.map(v => new BigNumber(v))
  let remaining = new BigNumber(total)

  // Correct 0 => 1 values due to the Number => BigNumber() conversion
  const valuesCorrection = new BigNumber(1).minus(
    values.reduce((total, v) => v.plus(total), 0)
  )
  const correctionIndex = highestValueIndex(values)
  values[correctionIndex] = values[correctionIndex].plus(valuesCorrection)

  if (
    values[correctionIndex].isGreaterThan(1) ||
    values[correctionIndex].isLessThan(0)
  ) {
    throw new Error('The values are too far from 1 to be corrected.')
  }

  // First pass, all numbers are rounded down
  const scaledValues = values.map(value => {
    const scaledValue = total.times(value)
    const scaledValueInteger = scaledValue.integerValue(BigNumber.ROUND_DOWN)
    remaining = remaining.minus(scaledValueInteger)
    return {
      value,
      scaledValue: scaledValueInteger,
      remain: scaledValue.modulo(1),
    }
  })

  // Add the remaining to the value that is the closest
  // to the next integer, until we reach `total`.
  let index = -1
  while (remaining.isGreaterThan(0)) {
    index = highestValueIndex(scaledValues.map(({ remain }) => remain))

    // The total of the values is not 1, we can stop adjusting here
    if (scaledValues[index].remain.isZero()) {
      break
    }

    scaledValues[index].scaledValue = scaledValues[index].scaledValue.plus(1)
    scaledValues[index].remain = new BigNumber(0)

    remaining = remaining.minus(1)
  }

  return scaledValues.map(p => p.scaledValue)
}

export const percentageList = (values, digits = 0) =>
  scaleValuesSet(values, digits)
