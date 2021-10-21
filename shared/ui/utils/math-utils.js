/**
 * Re-maps a number from one range to another.
 *
 * In the example above, the number '25' is converted from a value in the range
 * 0..100 into a value that ranges from the left edge (0) to the right edge
 * (width) of the screen. Numbers outside the range are not clamped to 0 and 1,
 * because out-of-range values are often intentional and useful.
 *
 * From Processing.js
 *
 * @param {Number} value        The incoming value to be converted
 * @param {Number} istart       Lower bound of the value's current range
 * @param {Number} istop        Upper bound of the value's current range
 * @param {Number} ostart       Lower bound of the value's target range
 * @param {Number} ostop        Upper bound of the value's target range
 * @returns {Number} the map result
 */
export function map(value, istart, istop, ostart, ostop) {
  return ostart + (ostop - ostart) * ((value - istart) / (istop - istart))
}

/**
 * Normalizes a number from another range into a value between 0 and 1.
 *
 * Identical to map(value, low, high, 0, 1)
 * Numbers outside the range are not clamped to 0 and 1, because out-of-range
 * values are often intentional and useful.
 *
 * From Processing.js
 *
 * @param {Number} aNumber    The incoming value to be converted
 * @param {Number} low        Lower bound of the value's current range
 * @param {Number} high       Upper bound of the value's current range
 * @returns {Number} the norm result
 */
export function norm(aNumber, low, high) {
  return (aNumber - low) / (high - low)
}

/**
 * Calculates a number between two numbers at a specific increment. The
 * progress parameter is the amount to interpolate between the two values where
 * 0.0 equal to the first point, 0.1 is very near the first point, 0.5 is
 * half-way in between, etc. The lerp function is convenient for creating
 * motion along a straight path and for drawing dotted lines.
 *
 * From Processing.js
 *
 * @param {Number} progress     between 0.0 and 1.0
 * @param {Number} value1       first value
 * @param {Number} value2       second value
 * @returns {Number} the lerp result
 */
export function lerp(progress, value1, value2) {
  return (value2 - value1) * progress + value1
}

/**
 * Constrains a value to not exceed a maximum and minimum value.
 *
 * From Processing.js
 *
 * @param {Number} aNumber   the value to constrain
 * @param {Number} aMin   minimum limit
 * @param {Number} aMax   maximum limit
 * @returns {Number} the clamp result
 */
export function clamp(aNumber, aMin, aMax) {
  return aNumber > aMax ? aMax : aNumber < aMin ? aMin : aNumber
}

/**
 * Returns a random integer between min (included) and max (excluded)
 * Note: Using Math.round() would give a non-uniform distribution
 *
 * From Mozilla MDN
 *
 * @param {Number} min    The minimum number (included)
 * @param {Number} max    The maximum number (excluded)
 * @returns {Number} the randomInt result
 */
export function randomInt(min, max) {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(Math.random() * (max - min)) + min
}

/**
 * Random number between two values.
 *
 * From Mozilla MDN
 *
 * @param {Number} min The minimum number (included)
 * @param {Number} max The maximum number (excluded)
 * @returns {Number} the random result
 */
export function random(min = 0, max = 1) {
  return Math.floor(Math.random() * (max - min)) + min
}

// Return 0 if denominator is 0 to avoid NaNs
export function safeDiv(num, denom) {
  return denom ? num / denom : 0
}

//converts epoch time into Block Duration
export const MILLISECONDS_IN_A_YEAR = 31557600000
export const MILLISECONDS_IN_A_QUARTER = 7889400000
export const MILLISECONDS_IN_A_SECOND = 1000
export const MILLISECONDS_IN_A_MONTH = 2629800000
export const MILLISECONDS_IN_A_WEEK = 604800000
export const MILLISECONDS_IN_A_DAY  =  86400000

export function millisecondsToBlocks(start, end, blockDuration = 15000) {
  return Math.round((end - start) / blockDuration)
}

export function millisecondsToYears(start,end) {
  return Math.floor( (end - start) / MILLISECONDS_IN_A_YEAR )
}

export function millisecondsToQuarters(start,end) {
  return Math.floor( (end - start) / MILLISECONDS_IN_A_QUARTER )
}

export function millisecondsToMonths(start,end) {
  return Math.floor( (end - start) / MILLISECONDS_IN_A_MONTH )
}

export function millisecondsToWeeks(start,end) {
  return Math.floor( (end - start) / MILLISECONDS_IN_A_WEEK )
}

export function millisecondsToDays(start,end) {
  return Math.floor( (end - start) / MILLISECONDS_IN_A_DAY )
}


export function blocksToMilliseconds(startBlock, endBlock, blockDuration = 15000) {
  return (endBlock - startBlock) * blockDuration
}

export function blocksToDays(blockCount, blockDuration = 15000) {
  return Math.ceil(blockCount * blockDuration / MILLISECONDS_IN_A_DAY)
}
