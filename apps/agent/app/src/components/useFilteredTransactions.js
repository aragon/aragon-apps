import { useState, useCallback, useMemo } from 'react'
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns'
import { TRANSACTION_TYPES } from '../transaction-types'
import { addressesEqual } from '../lib/web3-utils'

const INITIAL_DATE_RANGE = { start: null, end: null }
const INITIAL_TRANSACTION_TYPE = -1
const INITIAL_TOKEN = -1

function useFilteredTransactions({ transactions, tokens }) {
  const [page, setPage] = useState(0)
  const [selectedDateRange, setSelectedDateRange] = useState(INITIAL_DATE_RANGE)
  const [selectedTransactionType, setSelectedTransactionType] = useState(
    INITIAL_TRANSACTION_TYPE
  )
  const [selectedToken, setSelectedToken] = useState(INITIAL_TOKEN)
  const handleSelectedDateRangeChange = useCallback(range => {
    setPage(0)
    setSelectedDateRange(range)
  }, [])
  const handleTokenChange = useCallback(index => {
    setPage(0)
    setSelectedToken(index || INITIAL_TOKEN)
  }, [])
  const handleTransactionTypeChange = useCallback(index => {
    setPage(0)
    setSelectedTransactionType(index || INITIAL_TRANSACTION_TYPE)
  }, [])
  const handleClearFilters = useCallback(() => {
    setPage(0)
    setSelectedTransactionType(INITIAL_TRANSACTION_TYPE)
    setSelectedToken(INITIAL_TOKEN)
    setSelectedDateRange(INITIAL_DATE_RANGE)
  }, [])

  const tokensToFilter = useMemo(() => [{ symbol: 'All tokens' }, ...tokens], [
    tokens,
  ])

  const filteredTransactions = useMemo(
    () =>
      transactions.filter(({ tokenTransfers, type, date }) => {
        // Exclude by transaction type
        if (
          selectedTransactionType !== -1 &&
          TRANSACTION_TYPES[selectedTransactionType] !== type
        ) {
          return false
        }

        // Exclude by date range
        if (
          // We're not checking for an end date because we will always
          // have a start date for defining a range.
          selectedDateRange.start &&
          !isWithinInterval(new Date(date), {
            start: startOfDay(selectedDateRange.start),
            end: endOfDay(selectedDateRange.end),
          })
        ) {
          return false
        }
        // Exclude by token
        if (
          selectedToken > 0 &&
          tokenTransfers.findIndex(({ token }) =>
            addressesEqual(token, tokensToFilter[selectedToken].address)
          ) === -1
        ) {
          return false
        }

        // All good, we can include the transaction ✌️
        return true
      }),
    [
      selectedDateRange,
      selectedTransactionType,
      selectedToken,
      tokensToFilter,
      transactions,
    ]
  )
  const symbols = tokensToFilter.map(({ symbol }) => symbol)
  const emptyResultsViaFilters =
    !filteredTransactions.length &&
    (selectedToken > 0 ||
      selectedTransactionType > 0 ||
      selectedDateRange.start)
  return {
    emptyResultsViaFilters,
    filteredTransactions,
    handleClearFilters,
    handleSelectedDateRangeChange,
    handleTokenChange,
    handleTransactionTypeChange,
    page,
    setPage,
    selectedDateRange,
    selectedToken,
    selectedTransactionType,
    symbols,
  }
}

export default useFilteredTransactions
