import React, { useCallback, useMemo } from 'react'
import BN from 'bn.js'
import { useFromWei } from './web3-utils'
import useNow from './useNow.js'
import {
  useAppState,
  useCurrentApp,
  useInstalledApps,
  usePath,
} from '@aragon/api-react'

const HOLDER_ADDRESS_PATH = /^\/vesting\/0x[a-fA-F0-9]{40}\/?$/
const NO_HOLDER_ADDRESS = '-1'

function holderFromPath(path) {
  if (!path) {
    return NO_HOLDER_ADDRESS
  }
  const matches = path.match(HOLDER_ADDRESS_PATH)
  if (matches) {
  }
  return matches ? matches[0].split('/')[2] : NO_HOLDER_ADDRESS
}

// Get the vestings from the holder currently selected, or null otherwise.
export function useSelectedHolderVestings() {
  const { vestings } = useAppState()
  const [path, requestPath] = usePath()

  // The memoized holder currently selected.
  const selectedHolder = useMemo(() => {
    const holderAddress = holderFromPath(path)

    if (holderAddress === NO_HOLDER_ADDRESS) {
      return null
    }
    if (vestings) {
      return (
        vestings.find(vesting => vesting.receiver === holderAddress) || null
      )
    }
    return []
  }, [path, vestings])

  const selectHolder = useCallback(
    holderAddress => {
      requestPath(
        String(holderAddress) === NO_HOLDER_ADDRESS
          ? ''
          : `/vesting/${holderAddress}/`
      )
    },
    [requestPath]
  )

  return [selectedHolder, selectHolder]
}

// Decorate the vestings array with more information relevant
function useDecoratedVestings() {
  const { vestings, holders } = useAppState()
  const currentApp = useCurrentApp()
  const installedApps = useInstalledApps()

  return useMemo(() => {
    // Make sure we have loaded information about the current app and other installed apps before showing votes
    if (!(vestings && currentApp && installedApps)) {
      return [[], []]
    }

    return vestings
  }, [vestings])
}

export function toISODate(seconds) {
  return new Date(parseInt(seconds, 10) * 1000)
}

function getVestingUnlockedTokens(now, { start, end, amount, cliff }) {
  if (now >= end) {
    return amount
  }

  if (now < cliff) {
    return '0'
  }

  return String(new BN(amount).mul(now - start).div(end - start))
}

export function useVestedTokensInfo(vesting) {
  const nowDate = useNow()
  const now = parseInt(nowDate.getTime() / 1000, 10)

  const { amount, cliff, vesting: end, start } = vesting

  return useMemo(() => {
    // Shortcuts for before cliff and after vested cases.
    const unlockedTokens = getVestingUnlockedTokens(now, {
      amount,
      cliff,
      end,
      start,
    })

    const lockedTokens = (
      useFromWei(amount) - parseFloat(unlockedTokens)
    ).toFixed(2)

    const lockedPercentage = (
      (lockedTokens * 100) /
      useFromWei(amount)
    ).toFixed(2)

    const unlockedPercentage = (100 - lockedPercentage).toFixed(2)

    const cliffPercentage = ((cliff - start) * 100) / (end - start)

    return {
      cliffPercentage,
      lockedPercentage,
      lockedTokens,
      unlockedPercentage,
      unlockedTokens,
    }
  }, [amount, cliff, end, now, start])
}

// Handles the main logic of the app.
export function useAppLogic() {
  const [selectedHolder, selectHolder] = useSelectedHolderVestings()

  return {
    selectHolder,
    selectedHolder,
  }
}
