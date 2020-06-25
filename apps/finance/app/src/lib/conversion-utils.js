import { useEffect, useRef, useState } from 'react'
import BN from 'bn.js'
import { formatTokenAmount } from '@aragon/ui'

const CONVERT_API_RETRY_DELAY = 2 * 1000
const CONVERT_API_RETRY_DELAY_MAX = 60 * 1000
const CONVERT_PRECISION = 9

function convertRatesUrl(symbolsQuery) {
  return `https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=${symbolsQuery}`
}

/**
 * Convert an amount into another one using a rate.
 *
 * @param {BigInt|string|number} amount amount to convert
 * @param {BigInt|string|number} decimals number of decimals for the amount
 * @param {string|number} rate the rate to use for the conversion
 * @param {Object} [options] options passed to formatTokenAmount()
 * @returns {string} the formatted amount converted
 */
export function convertAmount(amount, decimals, rate, options) {
  amount = new BN(String(amount))
  decimals = parseInt(String(decimals), 10)
  return formatTokenAmount(
    amount
      .mul(new BN(10).pow(new BN(CONVERT_PRECISION)))
      .mul(new BN(rate * 10 ** CONVERT_PRECISION)),
    decimals + CONVERT_PRECISION * 2,
    options
  )
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
