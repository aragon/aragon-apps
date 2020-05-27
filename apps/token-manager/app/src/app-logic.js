import React, { useCallback, useMemo, useState, useEffect } from 'react'
import BN from 'bn.js'
import {
  useAppState,
  useCurrentApp,
  useInstalledApps,
  usePath,
} from '@aragon/api-react'
import { useNow } from './date-utils'
import { holderFromPath } from './routing'
import { addressesEqual } from './web3-utils'

// Get the vestings from the holder currently selected, or null otherwise.
export function useSelectedHolderVestings() {
  const { vestings, holders } = useAppState()
  const [path, requestPath] = usePath()

  // The memoized holder currently selected.
  const selectedHolder = useMemo(() => {
    let holder = {}
    let vesting = {}
    const holderAddress = holderFromPath(path)

    if (holderAddress === null) {
      return null
    }

    const holderInfo = { address: holderAddress }
    if (holders) {
      holderInfo.balance = holders.find(
        holder => holder.address === holderAddress
      ).balance
    }

    if (vestings && vestings[holderAddress]) {
      holderInfo.vestings = vestings[holderAddress]
    }

    return holderInfo
  }, [path, vestings])

  const selectHolder = useCallback(
    holderAddress => {
      requestPath(
        String(holderAddress) === null ? '' : `/vesting/${holderAddress}/`
      )
    },
    [requestPath]
  )
  const unselectHolder = useCallback(() => {
    requestPath('')
  }, [requestPath])

  return [selectedHolder, selectHolder, unselectHolder]
}

function getTimeProgress(time, start, end) {
  const progress = Math.max(0, Math.min(1, (time - start) / (end - start)))
  return progress
}

function getVestingUnlockedTokens(now, { start, end, amount, cliff }) {
  const amountBn = new BN(amount)

  if (now >= end) {
    return amountBn
  }

  if (now < cliff) {
    return new BN(0)
  }

  // Vesting progress: 0 => 1
  const progress = getTimeProgress(now, start, end)
  return new BN(amountBn).div(new BN(10000)).mul(new BN(progress * 10000))
}

export function useVestedTokensInfo(vesting) {
  const nowDate = useNow()
  const now = nowDate.getTime()

  const { amount, cliff, vesting: end, start } = vesting

  return useMemo(() => {
    return getVestedTokensInfo(now, { amount, cliff, vesting: end, start })
  }, [amount, cliff, end, now, start])
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

  const cliffProgress = getTimeProgress(cliff, start, end)

  return {
    cliffProgress,
    lockedPercentage,
    lockedTokens,
    unlockedPercentage,
    unlockedTokens,
  }
}

export function useTotalVestedTokensInfo(vestings) {
  const totalInfo = {}
  const now = useNow().getTime()

  if (!vestings) {
    return {
      totalAmount: new BN(0),
      totalLocked: new BN(0),
      totalUnlocked: new BN(0),
    }
  }
  totalInfo.totalAmount = vestings.reduce((total, vesting) => {
    return total.add(new BN(vesting.amount))
  }, new BN(0))

  totalInfo.totalLocked = vestings.reduce((total, vesting) => {
    return total.add(getVestedTokensInfo(now, vesting).lockedTokens)
  }, new BN(0))

  totalInfo.totalUnlocked = vestings.reduce((total, vesting) => {
    return total.add(getVestedTokensInfo(now, vesting).unlockedTokens)
  }, new BN(0))

  return totalInfo
}

// Handles the main logic of the app.
export function useAppLogic() {
  const [
    selectedHolder,
    selectHolder,
    unselectHolder,
  ] = useSelectedHolderVestings()

  return {
    selectHolder,
    selectedHolder,
    unselectHolder,
  }
}
