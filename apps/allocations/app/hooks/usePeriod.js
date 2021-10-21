import { useAragonApi } from '../api-react'

export default function usePeriod() {
  const { appState } = useAragonApi()
  if (!appState.period) return {}

  let { startDate, endDate } = appState.period
  const duration = endDate - startDate + 1000

  // if user visits page from the timeframe of what should be the *next*
  // period, but the period has not yet been updated on-chain, show them the
  // period as it will be calculated for their date
  while (endDate < new Date()) {
    startDate = new Date(endDate.getTime() + 1000)
    endDate = new Date(startDate.getTime() + duration)
  }

  return { startDate, endDate, duration }
}
