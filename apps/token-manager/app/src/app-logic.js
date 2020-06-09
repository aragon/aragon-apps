import { useCallback, useMemo } from 'react'
import BN from 'bn.js'
import { useAppState, usePath } from '@aragon/api-react'
import { useNow } from './hooks/useNow'
import { holderFromPath, pathFromHolder } from './routing'
import { getVestedTokensInfo } from './vesting-utils'
import { addressesEqual } from './web3-utils'

// Get the vestings from the holder currently selected, or null otherwise.
export function useSelectedHolderVestings() {
  const { holders, vestings } = useAppState()
  const [path, requestPath] = usePath()

  // The memoized holder currently selected.
  const selectedHolder = useMemo(() => {
    const holderInfo = {}
    const holderAddress = holderFromPath(path)

    if (holderAddress === null) {
      return holderInfo
    }

    holderInfo.address = holderAddress
    const holder = Array.isArray(holders)
      ? holders.find(holder => addressesEqual(holder.address, holderAddress))
      : null
    holderInfo.balance = holder ? holder.balance : new BN(0)
    holderInfo.vestings = (vestings && vestings[holderAddress]) || []

    return holderInfo
  }, [path, vestings])

  const selectHolder = useCallback(
    holderAddress => {
      requestPath(pathFromHolder(holderAddress))
    },
    [requestPath]
  )

  const unselectHolder = useCallback(() => {
    requestPath('')
  }, [requestPath])

  return [selectedHolder, selectHolder, unselectHolder]
}

export function useVestedTokensInfo(vesting) {
  const now = useNow()

  const { amount, start, cliff, vesting: end } = vesting.data

  return getVestedTokensInfo(now, {
    amount,
    start,
    cliff,
    vesting: end,
  })
}

export function useTotalVestedTokensInfo(vestings) {
  const now = useNow()

  if (!vestings || vestings.length === 0) {
    return {
      totalAmount: new BN(0),
      totalLocked: new BN(0),
      totalUnlocked: new BN(0),
    }
  }

  const totalAmount = vestings.reduce((total, vesting) => {
    return total.add(new BN(vesting.data.amount))
  }, new BN(0))

  const vestingsTokensInfo = vestings.map(vesting =>
    getVestedTokensInfo(now, vesting.data)
  )
  const totalLocked = vestingsTokensInfo.reduce((total, vestingTokenInfo) => {
    return total.add(vestingTokenInfo.lockedTokens)
  }, new BN(0))
  const totalUnlocked = vestingsTokensInfo.reduce((total, vestingTokenInfo) => {
    return total.add(vestingTokenInfo.unlockedTokens)
  }, new BN(0))

  return {
    totalAmount,
    totalLocked,
    totalUnlocked,
  }
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
