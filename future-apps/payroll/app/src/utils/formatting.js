import { fromDecimals } from './math-utils'

const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
})

export function formatTokenAmount(tokenAmount, { decimals, symbol }) {
  const adjustedAmount = parseInt(
    fromDecimals(tokenAmount.toString(), decimals.toNumber()),
    10
  )
  const formattedNumber = formatter.format(adjustedAmount)
  return `${formattedNumber} ${symbol}`
}
