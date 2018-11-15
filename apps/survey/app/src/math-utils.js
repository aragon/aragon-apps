import BigNumber from "bignumber.js";

// Get a list of rounded [0, `total`] numbers, from a list of [0, 1] values.
// If the total of the values is exactly 1, the total of the resulting values
// will be exactly `total`.
export function scaleValuesSet(values, digits = 0, total = 100) {
  const digitsMultiplicator = Math.pow(10, digits);

  if (values.length === 0) {
    return [];
  }

  let remaining = total * digitsMultiplicator;

  // First pass, all numbers are rounded down
  const percentages = values.map(value => {
    const percentage = Math.floor(value * total * digitsMultiplicator);
    remaining -= percentage;
    return {
      value,
      percentage,
      remain: (value * total * digitsMultiplicator) % 1
    };
  });

  // Add the remaining to the value that is the closest
  // to the next integer, until we reach `total`.
  let index = -1;
  while (remaining--) {
    index = percentages
      .map(({ remain }, index) => ({ remain, index }))
      .sort((p1, p2) => p2.remain - p1.remain)[0].index;

    // The total of the values is not 1, we stop adjusting here
    if (percentages[index].remain === 0) {
      break;
    }

    percentages[index].percentage += 1;
    percentages[index].remain = 0;
  }

  return percentages.map(p => p.percentage / digitsMultiplicator);
}

function highestValueIndex(values) {
  return values
    .map((value, index) => ({ value, index }))
    .sort((v1, v2) => v2.value.minus(v1.value))[0].index;
}

// Scale to `total` a set of values summing to 1.
export function scaleBigNumberValuesSet(
  values = [],
  total = new BigNumber(100),
  correctionLimit = 0.001
) {
  if (values.length === 0) {
    return [];
  }

  values = values.map(v => new BigNumber(v));
  let remaining = new BigNumber(total);

  const accumulatedTotal = values.reduce((total, v) => v.plus(total), 0);

  if (accumulatedTotal.isNegative()) {
    throw new Error("The sum of the values has to be a positive number.");
  }

  if (accumulatedTotal.minus(correctionLimit).isGreaterThan(1)) {
    throw new Error("The sum of the values has to be equal to or less than 1.");
  }

  // Get the difference to correct
  const valuesCorrection = new BigNumber(1).minus(accumulatedTotal);

  const shouldCorrect =
    !valuesCorrection.isZero() &&
    // Negative & out of limit have already thrown at this point,
    // so we should correct if it’s negative.
    (valuesCorrection.isNegative() ||
      valuesCorrection.isLessThanOrEqualTo(correctionLimit));

  // We always correct (up or down) the highest value
  const correctionIndex = shouldCorrect ? highestValueIndex(values) : -1;
  if (correctionIndex > -1) {
    values[correctionIndex] = values[correctionIndex].plus(valuesCorrection);
  }

  // First pass, all numbers are rounded down
  const scaledValues = values.map(value => {
    const scaledValue = total.times(value);
    const scaledValueInteger = scaledValue.integerValue(BigNumber.ROUND_DOWN);
    remaining = remaining.minus(scaledValueInteger);
    return {
      value,
      scaledValue: scaledValueInteger,
      remain: scaledValue.modulo(1)
    };
  });

  // Add the remaining to the value that is the closest
  // to the next integer, until we reach `total`.
  let index = -1;
  while (remaining.isGreaterThan(0)) {
    index = highestValueIndex(scaledValues.map(({ remain }) => remain));

    // The total of the values is not 1, we can stop adjusting here
    if (scaledValues[index].remain.isZero()) {
      break;
    }

    scaledValues[index].scaledValue = scaledValues[index].scaledValue.plus(1);
    scaledValues[index].remain = new BigNumber(0);

    remaining = remaining.minus(1);
  }

  return scaledValues.map(p => p.scaledValue);
}

export const percentageList = (values, digits = 0) =>
  scaleValuesSet(values, digits);
