import { useEffect, useRef, useState } from 'react'
import BN from 'bn.js'

const CONVERT_API_RETRY_DELAY = 2 * 1000
const CONVERT_API_RETRY_DELAY_MAX = 60 * 1000

const USD_DECIMALS = new BN('2')

function convertRatesUrl(symbolsQuery) {
  return `https://min-api.cryptocompare.com/data/price?fsym=USD&tsyms=${symbolsQuery}`
}

function formatConvertRate(convertRate, decimals) {
  const [whole = '', dec = ''] = convertRate.split('.')
  const parsedWhole = whole.replace(/^0*/, '')
  const parsedDec = dec.replace(/0*$/, '')
  // parsedWhole could be empty,
  // so in this case, we wanna remove leading zeros.
  const fullyParsedDec = parsedWhole ? parsedDec : parsedDec.replace(/^0*/, '')

  // Even if we remove leading zeroes from the decimal
  // part, we want to count as if we "shifted" them
  const decimalsToShift = decimals.sub(new BN(parsedDec.length.toString()))
  // Apart from always considering the USD decimals (2),
  // if there's the strange case that the above is negative,
  // we take it as a carry as we know we already shifted to far,
  // and will compensate by shifting the token amount by this much
  const carryAmount =
    decimalsToShift.toNumber() < 0
      ? decimalsToShift.add(USD_DECIMALS)
      : USD_DECIMALS
  // The remaining total amount to shift through bn.js to avoid overflow.
  const amountToShift = new BN('10').pow(
    decimalsToShift.toNumber() > 0 ? decimalsToShift : new BN('0')
  )

  // Finish shifting the whole number through BN.js to avoid overflow,
  return [
    new BN(`${parsedWhole}${fullyParsedDec}`).mul(amountToShift),
    carryAmount,
  ]
}

export function getConvertedAmount(amount, convertRate, decimals) {
  const [formattedConvertRate, carryAmount] = formatConvertRate(
    convertRate.toString(),
    decimals
  )

  // Get the actual precision we need to re-add when calculations are over
  const precisionTarget = new BN('10').pow(decimals.sub(USD_DECIMALS))
  const convertedAmount = amount
    // Shift the amount to take into account the USD decimals
    // + any leftover
    .mul(new BN('10').pow(carryAmount))
    // Actually convert to an USD rate
    .div(formattedConvertRate)
    // Return it to its original precision
    // Note that we don't have to subtract the "extra carry"
    // as it's undone during the division
    .mul(precisionTarget)

  return convertedAmount
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
