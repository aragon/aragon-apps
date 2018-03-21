// Return 0 if denominator is 0 to avoid NaNs
export function safeDiv(num, denom) {
  return denom ? num / denom : 0
}
