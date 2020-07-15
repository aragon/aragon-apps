import { useState, useCallback, useEffect, useMemo } from 'react'
import { endOfDay, isAfter, isBefore, startOfDay } from 'date-fns'
import {
  TRANSACTION_TYPES,
  TRANSACTION_TYPES_LABELS,
} from '../transaction-types'
import { addressesEqual } from '../lib/web3-utils'

const INITIAL_DATE_RANGE = { start: null, end: null }
const INITIAL_TRANSACTION_TYPE = -1
const INITIAL_TOKEN = -1

function useFilteredTransactions({ transactions, tokens }) {
  const [page, setPage] = useState(0)
  const [selectedDateRange, setSelectedDateRange] = useState(INITIAL_DATE_RANGE)
  const [selectedToken, setSelectedToken] = useState(INITIAL_TOKEN)
  const [selectedTransactionType, setSelectedTransactionType] = useState(
    INITIAL_TRANSACTION_TYPE
  )

  useEffect(() => setPage(0), [
    selectedDateRange,
    selectedToken,
    selectedTransactionType,
  ])

  const handleSelectedDateRangeChange = useCallback(range => {
    setSelectedDateRange(range)
  }, [])
  const handleTokenChange = useCallback(index => {
    setSelectedToken(index || INITIAL_TOKEN)
  }, [])
  const handleTransactionTypeChange = useCallback(index => {
    setSelectedTransactionType(index || INITIAL_TRANSACTION_TYPE)
  }, [])
  const handleClearFilters = useCallback(() => {
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

        // Filter separately by start and end date
        if (
          selectedDateRange.start &&
          isBefore(new Date(date), startOfDay(selectedDateRange.start))
        ) {
          return false
        }

        if (
          selectedDateRange.start &&
          isAfter(new Date(date), endOfDay(selectedDateRange.end))
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
    transactionTypes: TRANSACTION_TYPES_LABELS,
  }
}

export default useFilteredTransactions
