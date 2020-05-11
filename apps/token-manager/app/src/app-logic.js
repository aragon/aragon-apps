import React, { useCallback, useMemo } from 'react'
import { useFromWei } from './web3-utils'
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

export function vestedTokensInfo(amount, cliff, startDate, endDate) {
  let vestingInfo = {}
  const time = parseInt(new Date().getTime() / 1000)

  // Shortcuts for before cliff and after vested cases.
  if (time >= endDate) {
    vestingIngo.unlockedTokens = useFromWei(amount)
  } else if (time < cliff) {
    vestingInfo.unlockedTokens = 0
  } else {
    vestingInfo.unlockedTokens = (
      (useFromWei(amount) * (time - startDate)) /
      (endDate - startDate)
    ).toFixed(2)
  }

  vestingInfo.lockedTokens = (
    useFromWei(amount) - parseFloat(vestingInfo.unlockedTokens)
  ).toFixed(2)

  vestingInfo.lockedPercentage = (
    (vestingInfo.lockedTokens * 100) /
    useFromWei(amount)
  ).toFixed(2)

  vestingInfo.unlockedPercentage = (100 - vestingInfo.lockedPercentage).toFixed(
    2
  )

  vestingInfo.cliffPercentage =
    ((cliff - startDate) * 100) / (endDate - startDate)
  return vestingInfo
}

// Handles the main logic of the app.
export function useAppLogic() {
  const [selectedHolder, selectHolder] = useSelectedHolderVestings()

  return {
    selectHolder,
    selectedHolder,
  }
}
