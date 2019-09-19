import { useEffect, useMemo, useState, useCallback, useContext } from 'react'
import { useCurrentApp } from '@aragon/api-react'
import { useToast } from '@aragon/ui'
import {
  compareDesc,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
} from 'date-fns'
import { saveAs } from 'file-saver'
import * as TransferTypes from '../../transfer-types'
import { IdentityContext } from '../IdentityManager/IdentityManager'
import { addressesEqual, toChecksumAddress } from '../../lib/web3-utils'
import { formatTokenAmount } from '../../lib/utils'

const UNSELECTED_TOKEN_FILTER = -1
const UNSELECTED_TRANSFER_TYPE_FILTER = -1
const INITIAL_DATE_RANGE = { start: null, end: null }
const TRANSFER_TYPES = [
  TransferTypes.All,
  TransferTypes.Incoming,
  TransferTypes.Outgoing,
]
const formatDate = date => format(date, 'dd/MM/yy')
const getTokenDetails = (details, { address, decimals, symbol }) => {
  details[toChecksumAddress(address)] = {
    decimals,
    symbol,
  }
  return details
}
const getDownloadData = async (transfers, tokenDetails, resolveAddress) => {
  const mappedData = await Promise.all(
    transfers.map(
      async ({
        date,
        numData: { amount },
        reference,
        isIncoming,
        entity,
        token,
      }) => {
        const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
        const formattedAmount = formatTokenAmount(
          amount,
          isIncoming,
          decimals,
          true,
          { rounding: 5 }
        )
        const { name = '' } = (await resolveAddress(entity)) || {}
        return `${formatDate(
          date
        )},${name},${entity},${reference},${`"${formattedAmount} ${symbol}"`}`
      }
    )
  )
  return ['Date,Name,Source/Recipient,Reference,Amount']
    .concat(mappedData)
    .join('\n')
}
const getDownloadFilename = (appAddress, { start, end }) => {
  const today = format(Date.now(), 'yyyy-MM-dd')
  let filename = `finance_${appAddress}_${today}.csv`
  if (start && end) {
    const formattedStart = format(start, 'yyyy-MM-dd')
    const formattedEnd = format(end, 'yyyy-MM-dd')
    filename = `finance_${appAddress}_${formattedStart}_to_${formattedEnd}.csv`
  }
  return filename
}

function useFilterTransfers({
  transactions,
  tokens,
  selectedToken,
  setSelectedToken,
  selectedTransferType,
  setSelectedTransferType,
  selectedDateRange,
  setSelectedDateRange,
  setPage,
}) {
  const clearFilters = useCallback(() => {
    setSelectedTransferType(UNSELECTED_TRANSFER_TYPE_FILTER)
    setSelectedToken(UNSELECTED_TOKEN_FILTER)
    setSelectedDateRange(INITIAL_DATE_RANGE)
  }, [setSelectedTransferType, setSelectedToken, setSelectedDateRange])
  const transferType = TRANSFER_TYPES[selectedTransferType]
  const filteredTransfers = useMemo(
    () =>
      transactions.filter(
        ({ token, isIncoming, date }) =>
          (!selectedDateRange.start ||
            !selectedDateRange.end ||
            isWithinInterval(new Date(date), {
              start: startOfDay(selectedDateRange.start),
              end: endOfDay(selectedDateRange.end),
            })) &&
          (selectedToken === -1 ||
            addressesEqual(token, tokens[selectedToken - 1].address)) &&
          (transferType === TransferTypes.All ||
            selectedTransferType === UNSELECTED_TRANSFER_TYPE_FILTER ||
            (transferType === TransferTypes.Incoming && isIncoming) ||
            (transferType === TransferTypes.Outgoing && !isIncoming))
      ),
    [
      transactions,
      selectedToken,
      selectedTransferType,
      selectedDateRange,
      tokens,
    ]
  )
  const emptyResultsViaFilters = useMemo(
    () =>
      !filteredTransfers.length &&
      (selectedToken !== 0 ||
        selectedTransferType !== 0 ||
        selectedDateRange.start ||
        selectedDateRange.end),
    [filteredTransfers, selectedToken, selectedTransferType, selectedDateRange]
  )

  return { filteredTransfers, clearFilters, emptyResultsViaFilters }
}

function useDownload({ filteredTransfers, tokenDetails, selectedDateRange }) {
  const currentApp = useCurrentApp()
  const toast = useToast()
  const { resolve } = useContext(IdentityContext)
  const download = useCallback(async () => {
    if (!currentApp || !currentApp.appAddress) {
      return
    }
    const data = await getDownloadData(filteredTransfers, tokenDetails, resolve)
    const filename = getDownloadFilename(
      currentApp.appAddress,
      selectedDateRange
    )
    saveAs(new Blob([data], { type: 'text/csv;charset=utf-8' }), filename)
    toast('Transfers data exported')
  }, [currentApp, filteredTransfers, tokenDetails, resolve])
  return { download }
}

function useTransfers({ tokens, transactions }) {
  const [page, setPage] = useState(0)
  const [selectedToken, setSelectedToken] = useState(UNSELECTED_TOKEN_FILTER)
  const [selectedDateRange, setSelectedDateRange] = useState(INITIAL_DATE_RANGE)
  const [selectedTransferType, setSelectedTransferType] = useState(
    UNSELECTED_TRANSFER_TYPE_FILTER
  )
  const {
    clearFilters,
    filteredTransfers,
    emptyResultsViaFilters,
  } = useFilterTransfers({
    transactions,
    tokens,
    selectedToken,
    setSelectedToken,
    selectedTransferType,
    setSelectedTransferType,
    selectedDateRange,
    setSelectedDateRange,
  })
  const tokenDetails = useMemo(() => tokens.reduce(getTokenDetails, {}), [
    tokens,
  ])
  const { download } = useDownload({
    filteredTransfers,
    tokenDetails,
    selectedDateRange,
  })
  const symbols = useMemo(() => tokens.map(({ symbol }) => symbol), [tokens])
  const sortedTransfers = useMemo(
    () =>
      filteredTransfers.sort(({ date: dateLeft }, { date: dateRight }) =>
        // Sort by date descending
        compareDesc(dateLeft, dateRight)
      ),
    [filteredTransfers, compareDesc]
  )

  useEffect(() => {
    setPage(0)
  }, [setPage, selectedToken, selectedTransferType, selectedDateRange])

  return {
    clearFilters,
    emptyResultsViaFilters,
    download,
    page,
    selectedDateRange,
    selectedToken,
    setSelectedDateRange,
    setSelectedToken: useCallback(
      index => setSelectedToken(index || UNSELECTED_TOKEN_FILTER),
      [setSelectedToken]
    ),
    selectedTransferType,
    setSelectedTransferType: useCallback(
      index =>
        setSelectedTransferType(index || UNSELECTED_TRANSFER_TYPE_FILTER),
      [setSelectedTransferType]
    ),
    setPage,
    sortedTransfers,
    symbols,
    tokenDetails,
  }
}

export default useTransfers
