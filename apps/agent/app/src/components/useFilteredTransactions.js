import React, { useState, useCallback, useMemo } from 'react'
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

  const handleSelectedDateRangeChange = useCallback(
    range => {
      setPage(0)
      setSelectedDateRange(range)
    },
    [setPage, setSelectedDateRange]
  )
  const handleTokenChange = useCallback(
    index => {
      setPage(0)
      setSelectedToken(index || INITIAL_TOKEN)
    },
    [setPage, setSelectedToken]
  )
  const handleTransactionTypeChange = useCallback(
    index => {
      setPage(0)
      setSelectedTransactionType(index || INITIAL_TRANSACTION_TYPE)
    },
    [setPage, setSelectedTransactionType]
  )
  const handleClearFilters = useCallback(() => {
    setPage(0)
    setSelectedTransactionType(INITIAL_TRANSACTION_TYPE)
    setSelectedToken(INITIAL_TOKEN)
    setSelectedDateRange(INITIAL_DATE_RANGE)
  }, [
    setPage,
    setSelectedTransactionType,
    setSelectedToken,
    setSelectedDateRange,
  ])

  const filteredTransactions = transactions.filter(
    ({ tokenTransfers, type, date }) => {
      // Let's get the mapped index to transaction type for matching
      const mappedTransactionType = TRANSACTION_TYPES[selectedTransactionType]
      return (
        // First, let's filter transactions by date
        ((!selectedDateRange.start ||
          !selectedDateRange.end ||
          isWithinInterval(new Date(date), {
            start: startOfDay(selectedDateRange.start),
            end: endOfDay(selectedDateRange.end),
          })) &&
          // Then, we filter by tokens
          (selectedToken < 1 ||
            tokenTransfers.find(({ token }) =>
              addressesEqual(token, tokens[selectedToken - 1].address)
            )) &&
          // Last, by type
          selectedTransactionType < 1) ||
        mappedTransactionType === type
      )
    }
  )
  const emptyResultsViaFilters = useMemo(
    () =>
      !filteredTransactions.length &&
      (selectedToken > 1 ||
        selectedTransactionType > 1 ||
        selectedDateRange.start ||
        selectedDateRange.end),
    [
      filteredTransactions,
      selectedToken,
      selectedTransactionType,
      selectedDateRange,
    ]
  )

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
  }
}

export default useFilteredTransactions
