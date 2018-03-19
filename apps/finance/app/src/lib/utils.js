export const formatTokenAmount = (
  amount,
  decimals = 0,
  displaySign = false,
  { rounding = 2 } = {}
) =>
export const formatTokenAmount = (amount, displaySign = false) =>
  (displaySign && amount > 0 ? '+' : '') +
  Number(round(amount / Math.pow(10, decimals), rounding)).toLocaleString(
    'latn',
    {
      style: 'decimal',
      maximumFractionDigits: 18,
    }
  )
