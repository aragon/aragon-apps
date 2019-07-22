import React, { useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import {
  compareDesc,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
} from 'date-fns'
import {
  useViewport,
  theme,
  Button,
  ContextMenu,
  ContextMenuItem,
  DataView,
  GU,
  IconLabel,
  IconExternal,
  IconToken,
  blockExplorerUrl,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { saveAs } from 'file-saver'
import * as TransferTypes from '../transfer-types'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'
import TransfersFilters from './TransfersFilters'
import { useIdentity, IdentityContext } from './IdentityManager/IdentityManager'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'

const TRANSFER_TYPES = [
  TransferTypes.All,
  TransferTypes.Incoming,
  TransferTypes.Outgoing,
]
const TRANSFER_TYPES_STRING = TRANSFER_TYPES.map(TransferTypes.convertToString)
const formatDate = date => format(date, 'dd/MM/yy')
const getTokenDetails = (details, { address, decimals, symbol }) => {
  details[toChecksumAddress(address)] = {
    decimals,
    symbol,
  }
  return details
}
// Filter transfer based on the selected filters
const getFilteredTransfers = ({
  transactions,
  selectedToken,
  selectedTransferType,
  selectedDateRange,
}) => {
  const transferType = TRANSFER_TYPES[selectedTransferType]
  return transactions.filter(
    ({ token, isIncoming, date }) =>
      (!selectedDateRange.start ||
        !selectedDateRange.end ||
        isWithinInterval(new Date(date), {
          start: startOfDay(selectedDateRange.start),
          end: endOfDay(selectedDateRange.end),
        })) &&
      (selectedToken === null ||
        addressesEqual(token, selectedToken.address)) &&
      (transferType === TransferTypes.All ||
        (transferType === TransferTypes.Incoming && isIncoming) ||
        (transferType === TransferTypes.Outgoing && !isIncoming))
  )
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
const getDownloadFilename = (dao, { start, end }) => {
  const today = format(Date.now(), 'yyyy-MM-dd')
  let filename = `finance_${dao}_${today}.csv`
  if (start && end) {
    const formattedStart = format(start, 'yyyy-MM-dd')
    const formattedEnd = format(end, 'yyyy-MM-dd')
    filename = `finance_${dao}_${formattedStart}_to_${formattedEnd}.csv`
  }
  return filename
}

const Transfers = React.memo(({ dao, tokens, transactions }) => {
  const { below, above } = useViewport()
  const compactMode = below('medium')
  const network = useNetwork()
  const newTheme = useTheme()
  const [page, setPage] = useState(0)
  const [selectedIndexes, setSelectedIndexes] = useState([])
  const [selectedToken, setSelectedToken] = useState(0)
  const [selectedTransferType, setSelectedTransferType] = useState(0)
  const [selectedDateRange, setSelectedDateRange] = useState({
    start: null,
    end: null,
  })
  const handleSelectedDateRangeChange = range => {
    setPage(0)
    setSelectedDateRange(range)
  }
  const handleTokenChange = React.useCallback(
    index => {
      setPage(0)
      setSelectedToken(index)
    },
    [setPage, setSelectedToken]
  )
  const handleTransferTypeChange = React.useCallback(
    index => {
      setPage(0)
      setSelectedTransferType(index)
    },
    [setPage, setSelectedTransferType]
  )
  const filteredTransfers = getFilteredTransfers({
    transactions,
    selectedToken: selectedToken !== 0 ? tokens[selectedToken - 1] : null,
    selectedTransferType,
    selectedDateRange,
  })
  const symbols = tokens.map(({ symbol }) => symbol)
  const tokenDetails = tokens.reduce(getTokenDetails, {})
  const { resolve: resolveAddress } = React.useContext(IdentityContext)
  const handleDownload = React.useCallback(async () => {
    if (!selectedIndexes.length) {
      return
    }
    const data = await getDownloadData(
      filteredTransfers.filter((_, index) => selectedIndexes.includes(index)),
      tokenDetails,
      resolveAddress
    )
    const filename = getDownloadFilename(dao, selectedDateRange)
    saveAs(new Blob([data], { type: 'text/csv;charset=utf-8' }), filename)
  }, [filteredTransfers, tokenDetails, resolveAddress])

  return (
    <DataView
      currentPage={page}
      onPageChange={setPage}
      heading={
        <React.Fragment>
          <div
            css={`
              padding: ${2 * GU}px 0;
              display: flex;
              align-items: center;
              justify-content: space-between;
            `}
          >
            <div
              css={`
                color: ${theme.content};
                ${textStyle('body1')}
              `}
            >
              Transfers
            </div>
            <div css="text-align: right;">
              <Button
                onClick={handleDownload}
                disabled={!selectedIndexes.length}
              >
                <IconExternal /> Export
              </Button>
            </div>
          </div>
          <TransfersFilters
            dateRangeFilter={selectedDateRange}
            onDateRangeChange={handleSelectedDateRangeChange}
            tokenFilter={selectedToken}
            onTokenChange={handleTokenChange}
            transferTypeFilter={selectedTransferType}
            onTransferTypeChange={handleTransferTypeChange}
            compactMode={compactMode}
            symbols={symbols}
            transferTypes={TRANSFER_TYPES_STRING}
          />
        </React.Fragment>
      }
      fields={[
        { label: 'Date', priority: 2 },
        { label: 'Source/recipient', priority: 3 },
        { label: 'Reference', priority: 1 },
        { label: 'Amount', priority: 2 },
      ]}
      entries={filteredTransfers.sort(
        ({ date: dateLeft }, { date: dateRight }) =>
          // Sort by date descending
          compareDesc(dateLeft, dateRight)
      )}
      renderEntry={({
        date,
        entity,
        reference,
        isIncoming,
        numData: { amount },
        token,
      }) => {
        const formattedDate = format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
        const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
        const formattedAmount = formatTokenAmount(
          amount,
          isIncoming,
          decimals,
          true,
          { rounding: 5 }
        )

        return [
          <time dateTime={formattedDate} title={formattedDate}>
            {format(date, 'dd/MM/yy')}
          </time>,
          <div
            css={`
              padding: 0 ${0.5 * GU}px;
              ${above('medium') &&
                `
                  display: inline-flex;
                  max-width: ${above('large') ? 'unset' : '150px'};
                `}
            `}
          >
            <LocalIdentityBadge
              networkType={network.type}
              entity={entity}
              address={entity}
            />
          </div>,
          <div
            css={`
              padding: 0 ${0.5 * GU}px;
            `}
          >
            {reference}
          </div>,
          <span
            css={`
              font-weight: 600;
              color: ${isIncoming ? newTheme.positive : newTheme.negative};
            `}
          >
            {formattedAmount} {symbol}
          </span>,
        ]
      }}
      renderSelectionCount={count =>
        `${count} transfer${count !== 1 ? 's' : ''} selected`
      }
      onSelectEntries={(_, indexes) => {
        setSelectedIndexes(indexes)
      }}
      renderEntryActions={({ entity, transactionHash }) => (
        <ContextMenu>
          <ContextMenuViewTransaction
            transactionHash={transactionHash}
            network={network}
          />
          <ContextMenuItemCustomLabel entity={entity} />
        </ContextMenu>
      )}
    />
  )
})

Transfers.propTypes = {
  dao: PropTypes.string,
  tokens: PropTypes.array.isRequired,
  transactions: PropTypes.array.isRequired,
}

const ContextMenuItemCustomLabel = ({ entity }) => {
  const [label, showLocalIdentityModal] = useIdentity(entity)
  const handleEditLabel = useCallback(() => showLocalIdentityModal(entity))

  return (
    <ContextMenuItem onClick={handleEditLabel}>
      <IconLabel />
      {label ? 'Edit' : 'Add'} custom label
    </ContextMenuItem>
  )
}

const ContextMenuViewTransaction = ({ transactionHash, network }) => {
  const handleViewTransaction = useCallback(() => {
    window.open(
      blockExplorerUrl('transaction', transactionHash, {
        networkType: network.type,
      }),
      '_blank'
    )
  }, [transactionHash, network])

  return (
    <ContextMenuItem onClick={handleViewTransaction}>
      <IconToken /> View transaction
    </ContextMenuItem>
  )
}

export default Transfers
