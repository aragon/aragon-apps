import { useEffect, useState, useRef } from 'react'

const CONVERT_API_RETRY_DELAY = 2 * 1000
const CONVERT_API_RETRY_DELAY_MAX = 60 * 1000

function convertRatesUrl(symbolsQuery) {
  return `https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=${symbolsQuery}`
}

export function useConvertRates(symbols) {
  const [rates, setRates] = useState({})
  const retryDelay = useRef(CONVERT_API_RETRY_DELAY)

  const symbolsQuery = symbols.join(',')

  useEffect(() => {
    let cancelled = false
    let retryTimer = null

    const update = async () => {
      if (!symbolsQuery) {
        setRates({})
        return
      }

      try {
        const response = await fetch(convertRatesUrl(symbolsQuery))
        const rates = await response.json()
        if (!cancelled) {
          setRates(rates)
          retryDelay.current = CONVERT_API_RETRY_DELAY
        }
      } catch (err) {
        // The !cancelled check is needed in case:
        //  1. The fetch() request is ongoing.
        //  2. The component gets unmounted.
        //  3. An error gets thrown.
        //
        //  Assuming the fetch() request keeps throwing, it would create new
        //  requests even though the useEffect() got cancelled.
        if (!cancelled) {
          // Add more delay after every failed attempt
          retryDelay.current = Math.min(
            CONVERT_API_RETRY_DELAY_MAX,
            retryDelay.current * 1.2
          )
          retryTimer = setTimeout(update, retryDelay.current)
        }
      }
    }
    update()

    return () => {
      cancelled = true
      clearTimeout(retryTimer)
      retryDelay.current = CONVERT_API_RETRY_DELAY
    }
  }, [symbolsQuery])

  return rates
}
