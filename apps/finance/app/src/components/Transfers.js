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
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useConnectedAccount, useNetwork } from '@aragon/api-react'
import { saveAs } from 'file-saver'
import * as TransferTypes from '../transfer-types'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'
import TransfersFilters from './TransfersFilters'
import EmptyFilteredTransfers from './EmptyFilteredTransfers'
import EmptyTransactions from './EmptyTransactions'
import { useIdentity, IdentityContext } from './IdentityManager/IdentityManager'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'

const UNSELECTED_TOKEN_FILTER = -1
const UNSELECTED_TRANSFER_TYPE_FILTER = -1
const INITIAL_DATE_RANGE = { start: null, end: null }
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
        selectedTransferType === UNSELECTED_TRANSFER_TYPE_FILTER ||
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
const getDownloadFilename = (proxyAddress, { start, end }) => {
  const today = format(Date.now(), 'yyyy-MM-dd')
  let filename = `finance_${proxyAddress}_${today}.csv`
  if (start && end) {
    const formattedStart = format(start, 'yyyy-MM-dd')
    const formattedEnd = format(end, 'yyyy-MM-dd')
    filename = `finance_${proxyAddress}_${formattedStart}_to_${formattedEnd}.csv`
  }
  return filename
}

const Transfers = React.memo(({ proxyAddress, tokens, transactions }) => {
  const connectedAccount = useConnectedAccount()
  const network = useNetwork()
  const theme = useTheme()
  const { layoutName } = useLayout()

  const [page, setPage] = useState(0)
  const [selectedToken, setSelectedToken] = useState(UNSELECTED_TOKEN_FILTER)
  const [selectedTransferType, setSelectedTransferType] = useState(
    UNSELECTED_TRANSFER_TYPE_FILTER
  )
  const [selectedDateRange, setSelectedDateRange] = useState(INITIAL_DATE_RANGE)
  const handleSelectedDateRangeChange = range => {
    setPage(0)
    setSelectedDateRange(range)
  }
  const handleTokenChange = React.useCallback(
    index => {
      setPage(0)
      setSelectedToken(index || UNSELECTED_TOKEN_FILTER)
    },
    [setPage, setSelectedToken]
  )
  const handleTransferTypeChange = React.useCallback(
    index => {
      setPage(0)
      setSelectedTransferType(index || UNSELECTED_TOKEN_FILTER)
    },
    [setPage, setSelectedTransferType]
  )
  const handleClearFilters = useCallback(() => {
    setPage(0)
    setSelectedTransferType(UNSELECTED_TRANSFER_TYPE_FILTER)
    setSelectedToken(UNSELECTED_TOKEN_FILTER)
    setSelectedDateRange(INITIAL_DATE_RANGE)
  }, [setPage, setSelectedTransferType, setSelectedToken, setSelectedDateRange])
  const filteredTransfers = getFilteredTransfers({
    transactions,
    selectedToken: selectedToken > 0 ? tokens[selectedToken - 1] : null,
    selectedTransferType,
    selectedDateRange,
  })
  const symbols = tokens.map(({ symbol }) => symbol)
  const tokenDetails = tokens.reduce(getTokenDetails, {})
  const { resolve: resolveAddress } = React.useContext(IdentityContext)
  const handleDownload = React.useCallback(async () => {
    if (!proxyAddress) {
      return
    }

    const data = await getDownloadData(
      filteredTransfers,
      tokenDetails,
      resolveAddress
    )
    const filename = getDownloadFilename(proxyAddress, selectedDateRange)
    saveAs(new Blob([data], { type: 'text/csv;charset=utf-8' }), filename)
  }, [filteredTransfers, tokenDetails, resolveAddress])
  const emptyResultsViaFilters =
    !filteredTransfers.length &&
    (selectedToken !== 0 ||
      selectedTransferType !== 0 ||
      selectedDateRange.start ||
      selectedDateRange.end)

  const compactMode = layoutName === 'small'

  if (!transactions.length) {
    return <EmptyTransactions />
  }

  return (
    <DataView
      page={page}
      onPageChange={setPage}
      heading={
        <React.Fragment>
          <div
            css={`
              padding-bottom: ${2 * GU}px;
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
              <Button onClick={handleDownload}>
                <IconExternal
                  css={`
                    margin-right: ${1.5 * GU}px;
                    color: ${theme.surfaceIcon};
                  `}
                />{' '}
                Export
              </Button>
            </div>
          </div>
          {!compactMode && (
            <TransfersFilters
              dateRangeFilter={selectedDateRange}
              onDateRangeChange={handleSelectedDateRangeChange}
              tokenFilter={selectedToken}
              onTokenChange={handleTokenChange}
              transferTypeFilter={selectedTransferType}
              onTransferTypeChange={handleTransferTypeChange}
              compactMode={compactMode}
              symbols={['All tokens', ...symbols]}
              transferTypes={TRANSFER_TYPES_STRING}
            />
          )}
          {emptyResultsViaFilters && (
            <EmptyFilteredTransfers onClear={handleClearFilters} />
          )}
        </React.Fragment>
      }
      fields={
        emptyResultsViaFilters
          ? []
          : [
              { label: 'Date', priority: 2 },
              { label: 'Source/recipient', priority: 3 },
              { label: 'Reference', priority: 1 },
              { label: 'Amount', priority: 2 },
            ]
      }
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
              ${!compactMode
                ? `
                    display: inline-flex;
                    max-width: ${layoutName === 'large' ? 'unset' : '150px'};
                  `
                : ''}
            `}
          >
            <LocalIdentityBadge
              connectedAccount={addressesEqual(entity, connectedAccount)}
              entity={entity}
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
              color: ${isIncoming ? theme.positive : theme.negative};
            `}
          >
            {formattedAmount} {symbol}
          </span>,
        ]
      }}
      renderEntryActions={({ entity, transactionHash }) => (
        <ContextMenu zIndex={1}>
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
  proxyAddress: PropTypes.string,
  tokens: PropTypes.array.isRequired,
  transactions: PropTypes.array.isRequired,
}

const ContextMenuItemCustomLabel = ({ entity }) => {
  const theme = useTheme()
  const [label, showLocalIdentityModal] = useIdentity(entity)
  const handleEditLabel = useCallback(() => showLocalIdentityModal(entity))

  return (
    <ContextMenuItem onClick={handleEditLabel}>
      <IconLabel
        css={`
          color: ${theme.surfaceContentSecondary};
        `}
      />
      <span
        css={`
          margin-left: ${1 * GU}px;
        `}
      >
        {label ? 'Edit' : 'Add'} custom label
      </span>
    </ContextMenuItem>
  )
}

const ContextMenuViewTransaction = ({ transactionHash, network }) => {
  const theme = useTheme()
  const handleViewTransaction = useCallback(() => {
    window.open(
      blockExplorerUrl('transaction', transactionHash, {
        networkType: network.type,
      }),
      '_blank',
      'noopener'
    )
  }, [transactionHash, network])

  return (
    <ContextMenuItem onClick={handleViewTransaction}>
      <IconToken
        css={`
          color: ${theme.surfaceContentSecondary};
        `}
      />
      <span
        css={`
          margin-left: ${1 * GU}px;
        `}
      >
        View transaction
      </span>
    </ContextMenuItem>
  )
}

export default Transfers
