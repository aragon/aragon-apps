import React, { useState, useCallback } from 'react'
import { addressesEqual } from '../lib/web3-utils'
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns'
import { TRANSACTION_TYPES } from '../transaction-types'

const INITIAL_DATE_RANGE = { start: null, end: null }
const INITIAL_TOKEN = -1
const INITIAL_TRANSACTION_TYPE = -1

function useFilteredTransactions({ transactions, tokens }) {
  const [page, setPage] = useState(0)
  const [selectedToken, setSelectedToken] = useState(INITIAL_TOKEN)
  const [selectedTransactionType, setSelectedTransactionType] = useState(
    INITIAL_TRANSACTION_TYPE
  )
  const [selectedDateRange, setSelectedDateRange] = useState(INITIAL_DATE_RANGE)

  const handleSelectedDateRangeChange = range => {
    setPage(0)
    setSelectedDateRange(range)
  }
  const handleTokenChange = React.useCallback(
    index => {
      setPage(0)
      setSelectedToken(index || INITIAL_TOKEN)
    },
    [setPage, setSelectedToken]
  )
  const handleTransactionTypeChange = React.useCallback(
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
    // date
    ({ tokenTransfers, type, date }) => {
      const mappedTransactionType = TRANSACTION_TYPES[selectedTransactionType]
      return (
        ((!selectedDateRange.start ||
          !selectedDateRange.end ||
          isWithinInterval(new Date(date), {
            start: startOfDay(selectedDateRange.start),
            end: endOfDay(selectedDateRange.end),
          })) &&
          // token
          (selectedToken < 1 ||
            tokenTransfers.find(({ token }) =>
              addressesEqual(token, tokens[selectedToken - 1].address)
            )) &&
          // type
          selectedTransactionType < 1) ||
        mappedTransactionType === type
      )
    }
  )
  const emptyResultsViaFilters =
    !filteredTransactions.length &&
    (selectedToken > 1 ||
      selectedTransactionType > 1 ||
      selectedDateRange.start ||
      selectedDateRange.end)

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
