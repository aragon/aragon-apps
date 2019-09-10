import React, { useCallback } from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import { compareDesc, format } from 'date-fns'
import {
  Button,
  ContextMenu,
  ContextMenuItem,
  DataView,
  GU,
  IconExternal,
  IconToken,
  blockExplorerUrl,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import * as TransferTypes from '../transfer-types'
import { toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'
import TransfersFilters from './TransfersFilters'
import EmptyFilteredTransfers from './EmptyFilteredTransfers'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import useFilteredTransfers from './useFilteredTransfers'
import useDownloadData from './useDownloadData'

const TRANSFER_TYPES_LABELS = {
  'direct transfer': 'Transfer',
  'direct deposit': 'Deposit',
  'contract interaction': 'Contract interaction',
}
const TRANSFER_TYPES = [
  TransferTypes.All,
  TransferTypes.Incoming,
  TransferTypes.Outgoing,
]
const TRANSFER_TYPES_STRING = TRANSFER_TYPES.map(TransferTypes.convertToString)
const getTokenDetails = (details, { address, decimals, symbol }) => {
  details[toChecksumAddress(address)] = {
    decimals,
    symbol,
  }
  return details
}

const Transfers = React.memo(({ dao, tokens, transactions }) => {
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'
  const network = useNetwork()
  const theme = useTheme()

  const {
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
  } = useFilteredTransfers({ transactions, tokens })
  const tokenDetails = tokens.reduce(getTokenDetails, {})
  const { onDownload } = useDownloadData({
    filteredTransfers,
    tokenDetails,
    tokens,
    selectedDateRange,
    dao,
  })
  const symbols = tokens.map(({ symbol }) => symbol)

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
              <Button onClick={onDownload}>
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
              <InnerEntryColumn layoutName={layoutName} theme={theme}>
                From:{' '}
                <LocalIdentityBadge
                  entity={from || 'Agent'}
                  badgeOnly={!from}
                />
              </InnerEntryColumn>
              <InnerEntryColumn layoutName={layoutName} theme={theme}>
                To:{' '}
                <LocalIdentityBadge entity={to || 'Agent'} badgeOnly={!to} />
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
            {format(date, 'MM/dd/yy')}
          </time>
        )
        const badgeDiv = onlyOne ? (
          <div
            css={`
              ${layoutName === 'medium' &&
                `
                  display: inline-flex;
                  max-width: 150px;
                `}
              ${layoutName === 'large' &&
                `
                  display: inline-flex;
                  max-width: 'unset';
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
            {TRANSFER_TYPES_LABELS[type]}
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
            theme={theme}
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
  grid-template-columns: auto 1fr;
  grid-gap: ${1 * GU}px;
  align-items: center;
  width: 200px;

  ${({ layoutName }) =>
    layoutName === 'medium'
      ? `
          max-width: 250px;
          width: 250px;
        `
      : ''}
  ${({ layoutName }) =>
    layoutName === 'large'
      ? `
          /* max possible length of custom label + from length + some spacing */
          min-width: 342px;
          max-width: unset;
          width: unset;
        `
      : ''}
`

const ContextMenuViewTransaction = ({ transactionHash, network, theme }) => {
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
          color: ${theme.hint};
          margin-right: ${1 * GU}px;
        `}
      />{' '}
      View transaction
    </ContextMenuItem>
  )
}

export default Transfers
