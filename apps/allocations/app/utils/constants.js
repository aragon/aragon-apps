import { BigNumber } from 'bignumber.js'

export const ETH_DECIMALS = new BigNumber(10e17)
export const MIN_AMOUNT = new BigNumber(1e-18)
export const STATUSES = {
  0: 'Undergoing vote',
  1: 'Rejected',
  2: 'Approved',
  3: 'Enacted',
}
