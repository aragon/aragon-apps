import BN from 'bn.js'

function getTimeProgress(time, { start, end }) {
  const progress = Math.max(0, Math.min(1, (time - start) / (end - start)))
  return progress
}

export function getVestedTokensInfo(now, vesting) {
  const { amount, cliff, vesting: end, start } = vesting
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

function getVestingUnlockedTokens(now, { amount, start, cliff, end }) {
  const amountBn = new BN(amount)

  if (now >= end) {
    return amountBn
  }

  if (now < cliff) {
    return new BN(0)
  }

  // Vesting progress: 0 => 1
  const progress = getTimeProgress(now, { start, end })
  return new BN(amountBn).div(new BN(10000)).mul(new BN(progress * 10000))
}
