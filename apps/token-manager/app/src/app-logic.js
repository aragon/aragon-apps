import React, { useCallback, useMemo, useState, useEffect } from 'react'
import BN from 'bn.js'
import {
  useAppState,
  useCurrentApp,
  useInstalledApps,
  usePath,
} from '@aragon/api-react'
import { addressesEqual } from './web3-utils'
import { holderFromPath } from './routing'

// Get the vestings from the holder currently selected, or null otherwise.
export function useSelectedHolderVestings() {
  const { vestings, holders } = useAppState()
  const [path, requestPath] = usePath()
  let holderVestingInfo = {}

  // The memoized holder currently selected.
  const selectedHolder = useMemo(() => {
    const holderAddress = holderFromPath(path)

    if (holderAddress === null) {
      return null
    }

    if (vestings) {
      holderVestingInfo = vestings.find(
        vesting => vesting.receiver === holderAddress
      )
    }
    if (holders) {
      holderVestingInfo.holderBalance = holders.find(
        holder => holder.address === holderAddress
      )
    }
    return holderVestingInfo
  }, [path, vestings])

  const selectHolder = useCallback(
    holderAddress => {
      requestPath(
        String(holderAddress) === null ? '' : `/vesting/${holderAddress}/`
      )
    },
    [requestPath]
  )

  return [selectedHolder, selectHolder]
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

// Update `now` at a given interval.
export function useNow(updateEvery = 1000) {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(new Date())
    }, updateEvery)
    return () => {
      clearInterval(timer)
    }
  }, [updateEvery])
  return now
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
  const [selectedHolder, selectHolder] = useSelectedHolderVestings()

  return {
    selectHolder,
    selectedHolder,
  }
}
