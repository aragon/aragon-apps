import React, { useState, useCallback } from 'react'
import { addressesEqual } from '../lib/web3-utils'
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns'

const INITIAL_DATE_RANGE = { start: null, end: null }
const INITIAL_TRANSFER_TYPE = -1
const INITIAL_TOKEN = -1
const TRANSFER_TYPE_INCOMING = 1
const TRANSFER_TYPE_OUTGOING = 2

function useFilteredTransfers({ transactions, tokens }) {
  const [page, setPage] = useState(0)
  const [selectedToken, setSelectedToken] = useState(INITIAL_TOKEN)
  const [selectedTransferType, setSelectedTransferType] = useState(
    INITIAL_TRANSFER_TYPE
  )
  const [selectedDateRange, setSelectedDateRange] = useState(INITIAL_DATE_RANGE)

  const handleSelectedDateRangeChange = range => {
    console.log('Date change: ', range)
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
  const handleTransferTypeChange = React.useCallback(
    index => {
      setPage(0)
      setSelectedTransferType(index || INITIAL_TRANSFER_TYPE)
    },
    [setPage, setSelectedTransferType]
  )
  const handleClearFilters = useCallback(() => {
    setPage(0)
    setSelectedTransferType(INITIAL_TRANSFER_TYPE)
    setSelectedToken(INITIAL_TOKEN)
    setSelectedDateRange(INITIAL_DATE_RANGE)
  }, [setPage, setSelectedTransferType, setSelectedToken, setSelectedDateRange])

  const filteredTransfers = transactions.filter(
    // date
    ({ tokenTransfers, isIncoming, isOutgoing, date }) =>
      ((!selectedDateRange.start ||
        !selectedDateRange.end ||
        isWithinInterval(new Date(date), {
          start: startOfDay(selectedDateRange.start),
          end: endOfDay(selectedDateRange.end),
        })) &&
        // token
        ((selectedToken < 1 ||
          tokenTransfers.find(({ token }) =>
            addressesEqual(token, tokens[selectedToken - 1].address)
          )) &&
          // type
          selectedTransferType < 1)) ||
      (selectedTransferType === TRANSFER_TYPE_INCOMING && isIncoming) ||
      (selectedTransferType === TRANSFER_TYPE_OUTGOING && isOutgoing)
  )
  const emptyResultsViaFilters =
    !filteredTransfers.length &&
    (selectedToken > 1 ||
      selectedTransferType > 1 ||
      selectedDateRange.start ||
      selectedDateRange.end)

  return {
    emptyResultsViaFilters,
    filteredTransfers,
    handleClearFilters,
    handleSelectedDateRangeChange,
    handleTokenChange,
    handleTransferTypeChange,
    page,
    setPage,
    selectedDateRange,
    selectedToken,
    selectedTransferType,
  }
}

export default useFilteredTransfers
