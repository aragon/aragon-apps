import BN from 'bn.js'
import { dayjs } from './date-utils'

function getTimeProgress(time, { start, end }) {
  const fromStart = dayjs(time).diff(dayjs(start))
  const fromEnd = dayjs(end).diff(dayjs(time))
  return Math.max(0, Math.min(1, fromStart / fromEnd))
}

function getVestingUnlockedTokens(time, { amount, start, cliff, end }) {
  const amountBn = new BN(amount)

  if (!dayjs(time).isBefore(dayjs(end))) {
    return amountBn
  }

  if (dayjs(time).isBefore(dayjs(cliff))) {
    return new BN(0)
  }

  // Vesting progress: 0 => 1
  const progress = getTimeProgress(time, { start, end })
  return new BN(amountBn).div(new BN(10000)).mul(new BN(progress * 10000))
}

export function getVestedTokensInfo(now, vestingData) {
  const { amount, start, cliff, vesting: end } = vestingData
  const amountBn = new BN(amount)

  // Shortcuts for before cliff and after vested cases.
  const unlockedTokens = getVestingUnlockedTokens(now, {
    amount,
    cliff,
    end,
    start,
  })

  const lockedTokens = amountBn.sub(unlockedTokens)

  // We keep two more digits in the percentages
  // for display purposes (10000 rather than 100).
  const lockedPercentage =
    lockedTokens
      .mul(new BN(10000))
      .div(amountBn)
      .toNumber() / 100

  const unlockedPercentage = 100 - lockedPercentage

  const cliffProgress = getTimeProgress(cliff, { start, end })

  return {
    cliffProgress,
    lockedPercentage,
    lockedTokens,
    unlockedPercentage,
    unlockedTokens,
  }
}
