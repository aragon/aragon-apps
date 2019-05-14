import BN from 'bn.js'

export const SECONDS_IN_A_YEAR = new BN(365.25 * 24 * 60 * 60)
export const NO_END = new BN(Math.pow(2, 64) - 1) // MAX_UINT64
