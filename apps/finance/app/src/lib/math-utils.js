/**
 * Generic round function, see:
 *  - https://stackoverflow.com/a/18358056/1375656
 *  - https://stackoverflow.com/a/19722641/1375656
 *
 * Fixed for NaNs on really small values
 *
 * @param {number} num Number to round
 * @param {number} [places=2] Number of places to round to
 * @param {number} Rounded number
 */
export function round(num, places = 2) {
  const rounded = +(Math.round(num + 'e+' + places) + 'e-' + places)
  return Number.isNaN(rounded) ? 0 : rounded
}
