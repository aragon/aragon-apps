export const formatTokenAmount = (amount, displaySign = false) =>
  (displaySign && amount > 0 ? '+' : '') +
  Number(amount).toLocaleString('latn', {
    style: 'decimal',
    maximumFractionDigits: 18,
  })
