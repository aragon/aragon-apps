import { useMemo, useState } from 'react'
import { useApi, useNetwork } from '@aragon/api-react'

import usePromise from './usePromise'
import useInterval from './useInterval'
import { loadBlockTimestamp, loadLatestBlock } from '../web3-utils'

const NETWORK_TIMES = new Map([
  ['main', 13],
  ['kovan', 4],
  ['rinkeby', 14],
  ['ropsten', 11],
  ['goerli', 15],
  ['private', 3],
  ['xdai', 5],
])

export function useBlockTime() {
  const network = useNetwork()

  return useMemo(() => (network ? NETWORK_TIMES.get(network.type) : 5), [
    network,
  ])
}

export function useLatestBlock(updateEvery = 1000) {
  const api = useApi()
  const [block, setBlock] = useState({ number: 0, timeStamp: 0 })

  useInterval(
    async () => {
      const { number, timestamp } = api ? await loadLatestBlock(api) : block
      // Prevent unnecessary re-renders
      if (number !== block.number) setBlock({ number, timestamp })
    },
    updateEvery,
    true
  )

  return block
}

export function useBlockTimeStamp(blockNumber, load = false) {
  const api = useApi()
  const blockTimeStampPromise = useMemo(() => {
    return load ? loadBlockTimestamp(api, blockNumber) : dummyFn
  }, [api, blockNumber, load])
  return usePromise(blockTimeStampPromise, [], 0)
}

const dummyFn = async () => {
  return 0
}
