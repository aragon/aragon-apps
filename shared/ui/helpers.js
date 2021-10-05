import BigNumber from 'bignumber.js'

import { ETH_DECIMALS_NUMBER } from './constants'

export const displayCurrency = (amount, decimalsNumber=ETH_DECIMALS_NUMBER) => {
  const decimals = BigNumber(10).pow(decimalsNumber)
  return BigNumber(amount).div(decimals).dp(3).toString()
}
