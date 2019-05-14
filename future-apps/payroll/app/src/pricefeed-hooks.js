import { useEffect, useState } from 'react'
import { useApi, useAppState } from '@aragon/api-react'
import PRICE_FEED_GET_ABI from './abi/price-feed-get'
import PPF_EVENTS_ABI from './abi/ppf-events'
import { useExternalContract } from './utils/hooks'

const priceFeedAbi = [].concat(PRICE_FEED_GET_ABI, PPF_EVENTS_ABI)

// Load and returns the price feed contract, or null if not loaded yet.
// Even though there's only ever one price feed set, it may change over time
export function usePriceFeedContract() {
  const { priceFeedAddress } = useAppState()
  return useExternalContract(priceFeedAddress, priceFeedAbi)
}

export function usePriceFeedUpdate(updateEvery = 1000) {
  const api = useApi()
  const priceFeed = usePriceFeedContract()
  const [lastUpdateDate, setLastUpdateDate] = useState(new Date())

  useEffect(() => {
    let subscription
    ;(async function subscribe() {
      const currentBlock = await api.web3Eth('getBlockNumber').toPromise()
      subscription = priceFeed
        .events(currentBlock)
        .subscribe(() => setLastUpdateDate(new Date()))
    })() // Immediately invoke async subscription

    return () => {
      subscription && subscription.unsubscribe()
    }
  }, [api, priceFeed])

  return lastUpdateDate
}
