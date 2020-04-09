import { useCallback, useEffect, useMemo, useState } from 'react'
import { endOfDay, isWithinInterval, startOfDay } from 'date-fns'
import {
  TRANSFER_TYPES,
  TRANSFER_TYPES_LABELS,
  Incoming,
  Outgoing,
} from '../transfer-types'
import { addressesEqual } from '../lib/web3-utils'

const UNSELECTED_TOKEN_FILTER = -1
const UNSELECTED_TRANSFER_TYPE_FILTER = -1
const UNSELECTED_DATE_RANGE_FILTER = { start: null, end: null }

function useFilteredTransfers({ transactions, tokens }) {
  const [page, setPage] = useState(0)
  const [selectedDateRange, setSelectedDateRange] = useState(
    UNSELECTED_DATE_RANGE_FILTER
  )
  const [selectedTransferType, setSelectedTransferType] = useState(
    UNSELECTED_TRANSFER_TYPE_FILTER
  )
  const [selectedToken, setSelectedToken] = useState(UNSELECTED_TOKEN_FILTER)

  useEffect(() => setPage(0), [
    selectedDateRange,
    selectedTransferType,
    selectedToken,
  ])

  const handleSelectedDateRangeChange = useCallback(range => {
    setSelectedDateRange(range)
  }, [])
  const handleTokenChange = useCallback(index => {
    const tokenIndex = index === 0 ? -1 : index
    setSelectedToken(tokenIndex)
  }, [])
  const handleTransferTypeChange = useCallback(index => {
    const transferTypeIndex = index === 0 ? -1 : index
    setSelectedTransferType(transferTypeIndex)
  }, [])
  const handleClearFilters = useCallback(() => {
    setSelectedTransferType(UNSELECTED_TRANSFER_TYPE_FILTER)
    setSelectedToken(UNSELECTED_TOKEN_FILTER)
    setSelectedDateRange(UNSELECTED_DATE_RANGE_FILTER)
  }, [])

  const tokensToFilter = useMemo(() => [{ symbol: 'All tokens' }, ...tokens], [
    tokens,
  ])

  const filteredTransfers = useMemo(
    () =>
      transactions.filter(({ date, isIncoming, token }) => {
        const type = isIncoming ? Incoming : Outgoing
        // Exclude by transaction type
        if (
          selectedTransferType !== -1 &&
          TRANSFER_TYPES[selectedTransferType] !== type
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
          !addressesEqual(token, tokensToFilter[selectedToken].address)
        ) {
          return false
        }

        // All good, we can include the transaction ✌️
        return true
      }),
    [
      selectedDateRange,
      selectedTransferType,
      selectedToken,
      tokensToFilter,
      transactions,
    ]
  )
  const symbols = tokensToFilter.map(({ symbol }) => symbol)
  const emptyResultsViaFilters =
    !filteredTransfers &&
    (selectedToken > 0 || selectedTransferType > 0 || selectedDateRange.start)

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
    symbols,
    transferTypes: TRANSFER_TYPES_LABELS,
  }
}

export default useFilteredTransfers
