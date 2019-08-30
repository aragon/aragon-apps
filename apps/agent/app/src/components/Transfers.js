import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
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
import { useNetwork } from '@aragon/api-react'
import { saveAs } from 'file-saver'
import * as TransferTypes from '../transfer-types'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'
import TransfersFilters from './TransfersFilters'
import EmptyFilteredTransfers from './EmptyFilteredTransfers'
import { useIdentity, IdentityContext } from './IdentityManager/IdentityManager'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'

const TYPES = {
  'direct transfer': 'Transfer',
  'direct deposit': 'Deposit',
  'contract interaction': 'Contract interaction',
}
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
        entity,
        token,
        isIncoming,
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
  const { layoutName } = useLayout()
  const compactMode = below('medium')
  const network = useNetwork()
  const theme = useTheme()
  const [page, setPage] = useState(0)
  const [selectedToken, setSelectedToken] = useState(0)
  const [selectedTransferType, setSelectedTransferType] = useState(0)
  const [selectedDateRange, setSelectedDateRange] = useState(INITIAL_DATE_RANGE)
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
  const handleClearFilters = useCallback(() => {
    setPage(0)
    setSelectedTransferType(0)
    setSelectedToken(0)
    setSelectedDateRange(INITIAL_DATE_RANGE)
  }, [setPage, setSelectedTransferType, setSelectedToken, setSelectedDateRange])
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
    const data = await getDownloadData(
      filteredTransfers,
      tokenDetails,
      resolveAddress
    )
    const filename = getDownloadFilename(dao, selectedDateRange)
    saveAs(new Blob([data], { type: 'text/csv;charset=utf-8' }), filename)
  }, [filteredTransfers, tokenDetails, resolveAddress])
  const emptyResultsViaFilters =
    !filteredTransfers.length &&
    (selectedToken !== 0 ||
      selectedTransferType !== 0 ||
      selectedDateRange.start ||
      selectedDateRange.end)

  return (
    <DataView
      page={page}
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
              <Button onClick={handleDownload}>
                <IconExternal /> Export
              </Button>
            </div>
          </div>
          {layoutName !== 'small' && (
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
              { label: 'Source/recipient', priority: 5 },
              { label: 'Type', priority: 3 },
              { label: 'Reference', priority: 1 },
              { label: 'Amount', priority: 4 },
            ]
      }
      entries={filteredTransfers.sort(
        ({ date: dateLeft }, { date: dateRight }) =>
          // Sort by date descending
          compareDesc(dateLeft, dateRight)
      )}
      renderEntryExpansion={({ tokenTransfers }) => {
        if (tokenTransfers.length === 1) {
          return
        }

        return tokenTransfers.map(({ to, from, amount, token }) => {
          const isIncoming = !!from
          const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
          const formattedAmount = formatTokenAmount(
            amount,
            isIncoming,
            decimals,
            true,
            { rounding: 5 }
          )

          return (
            <div
              css={`
                width: 100%;
                display: grid;
                grid-template-columns: auto auto 1fr;
                grid-gap: ${3 * GU}px;
                align-items: center;
                justify-content: space-between;
              `}
            >
              <InnerEntryColumn above={above} theme={theme}>
                From: <AgentOrEntity entity={from} />
              </InnerEntryColumn>
              <InnerEntryColumn above={above} theme={theme}>
                To: <AgentOrEntity entity={to} />
              </InnerEntryColumn>
              <div
                css={`
                  text-align: right;
                  color: ${isIncoming
                    ? theme.positive
                    : theme.surfaceContentSecondary};
                `}
              >
                {formattedAmount} {symbol}
              </div>
            </div>
          )
        })
      }}
      renderEntry={({
        date,
        description: reference,
        type,
        tokenTransfers,
        onlyOne,
        isIncoming,
      }) => {
        const [{ token, amount, to, from }] = tokenTransfers
        const formattedDate = format(date, "yyyy-MM-dd'T'HH:mm:ss")
        const dateDiv = (
          <time
            dateTime={formattedDate}
            title={formattedDate}
            css={`
              ${textStyle('body2')};
              color: ${theme.surfaceContent};
            `}
          >
            {format(date, 'MM/DD/YY')}
          </time>
        )
        const badgeDiv = onlyOne ? (
          <div
            css={`
              ${above('medium') &&
                `
                  display: inline-flex;
                  max-width: ${above('large') ? 'unset' : '150px'};
                `}
            `}
          >
            <LocalIdentityBadge
              networkType={network.type}
              entity={to || from}
            />
          </div>
        ) : (
          <LocalIdentityBadge badgeOnly entity="Multiple accounts" />
        )
        const typeDiv = (
          <div
            css={`
              ${textStyle('body2')};
              color: ${theme.surfaceContent};
            `}
          >
            {TYPES[type]}
          </div>
        )
        const referenceDiv = (
          <div
            css={`
              ${textStyle('body2')};
              color: ${theme.surfaceContent};
            `}
          >
            {reference}
          </div>
        )
        const amountDiv = (() => {
          if (!onlyOne) {
            const uniqueTokens = Object.keys(
              tokenTransfers.reduce((p, { token }) => {
                p[token] = 1
                return p
              }, {})
            ).length
            return (
              <div
                css={`
                  ${textStyle('body2')};
                  color: ${theme.surfaceContent};
                `}
              >
                {uniqueTokens} token{uniqueTokens > 1 ? 's' : ''}
              </div>
            )
          }

          const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
          const formattedAmount = formatTokenAmount(
            amount,
            isIncoming,
            decimals,
            true,
            { rounding: 5 }
          )
          return (
            <span
              css={`
                ${textStyle('body2')};
                color: ${isIncoming ? theme.positive : theme.surfaceContent};
              `}
            >
              {formattedAmount} {symbol}
            </span>
          )
        })()

        return [dateDiv, badgeDiv, typeDiv, referenceDiv, amountDiv]
      }}
      renderEntryActions={({ transactionHash }) => (
        <ContextMenu>
          <ContextMenuViewTransaction
            transactionHash={transactionHash}
            network={network}
          />
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

const InnerEntryColumn = styled.div`
  color: ${({ theme }) => theme.surfaceContentSecondary};
  ${textStyle('label2')};
  display: inline-grid;
  grid-template-columns: 40px 1fr;
  grid-gap: ${0.5 * GU}px;
  align-items: center;
  width: 200px;

  ${({ above }) =>
    above('medium')
      ? `
          max-width: 250px;
          width: 250px;
        `
      : ''}
  ${({ above }) =>
    above('large')
      ? `
          /* max possible length of custom label + from length + some spacing */
          min-width: 342px;
          max-width: unset;
          width: unset;
        `
      : ''}
`

const AgentOrEntity = ({ entity }) => (
  <LocalIdentityBadge entity={entity ? entity : 'Agent'} badgeOnly={!!entity} />
)

const ContextMenuViewTransaction = ({ transactionHash, network }) => {
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
      <IconToken /> View transaction
    </ContextMenuItem>
  )
}

export default Transfers
