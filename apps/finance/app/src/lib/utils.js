import { round } from './math-utils'

// TODO: move these utilities to Aragon UI

export const randomInt = (min, max, random = Math.random) => {
  min = Math.ceil(min)
  max = Math.floor(max)
  return Math.floor(random() * (max - min)) + min
}

export const randomEntry = (array, random = Math.random) =>
  array[randomInt(0, array.length, random)]

export const formatTokenAmount = (
  amount,
  decimals = 0,
  displaySign = false,
  { rounding = 2 } = {}
) =>
  (displaySign && amount > 0 ? '+' : '') +
  Number(round(amount / Math.pow(10, decimals), rounding)).toLocaleString(
    'latn',
    {
      style: 'decimal',
      maximumFractionDigits: 18,
    }
  )
