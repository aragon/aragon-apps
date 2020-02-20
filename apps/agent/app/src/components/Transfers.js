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
  IconLabel,
  blockExplorerUrl,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useConnectedAccount, useNetwork } from '@aragon/api-react'
import {
  TRANSACTION_TYPES_LABELS,
  TRANSACTION_TYPES_STRING,
} from '../transaction-types'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'
import TransfersFilters from './TransfersFilters'
import EmptyTransactions from './EmptyTransactions'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import useFilteredTransfers from './useFilteredTransfers'
import useDownloadData from './useDownloadData'
import { useIdentity } from './IdentityManager/IdentityManager'

function getTokenDetails(details, { address, decimals, symbol }) {
  details[toChecksumAddress(address)] = {
    decimals,
    symbol,
  }
  return details
}

const Transfers = React.memo(function Transfers({ dao, tokens, transactions }) {
  const connectedAccount = useConnectedAccount()
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
    handleTransactionTypeChange,
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

  if (!transactions.length) {
    return <EmptyTransactions />
  }

  return (
    <DataView
      status={emptyResultsViaFilters ? 'empty-filters' : 'default'}
      page={page}
      onPageChange={setPage}
      onStatusEmptyClear={handleClearFilters}
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
            {layoutName !== 'small' && (
              <TransfersFilters
                dateRangeFilter={selectedDateRange}
                onDateRangeChange={handleSelectedDateRangeChange}
                tokenFilter={selectedToken}
                onTokenChange={handleTokenChange}
                transferTypeFilter={selectedTransferType}
                onTransactionTypeChange={handleTransactionTypeChange}
                compactMode={compactMode}
                symbols={['All tokens', ...symbols]}
                transferTypes={TRANSACTION_TYPES_STRING}
              />
            )}
            <div css="text-align: right;">
              <Button onClick={onDownload}>
                <IconExternal /> Export
              </Button>
            </div>
          </div>
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
          const amountColor = isIncoming
            ? theme.positive
            : formattedAmount.includes('-')
            ? theme.negative
            : theme.surfaceContent
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
                  color: ${amountColor};
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
        targetContract,
      }) => {
        const [{ token, amount, to, from } = {}] = tokenTransfers
        const entity = to || from
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
              connectedAccount={addressesEqual(entity, connectedAccount)}
              networkType={network && network.type}
              entity={entity}
            />
          </div>
        ) : (
          <LocalIdentityBadge
            badgeOnly={typeof targetContract !== 'string'}
            entity={
              (!tokenTransfers.length && targetContract) || 'Multiple accounts'
            }
            networkType={
              typeof targetContract === 'string' && network && network.type
            }
          />
        )
        const typeDiv = (
          <div
            css={`
              ${textStyle('body2')};
              color: ${theme.surfaceContent};
            `}
          >
            {TRANSACTION_TYPES_LABELS[type]}
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
                {uniqueTokens} token
                {uniqueTokens > 1 || uniqueTokens === 0 ? 's' : ''}
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
          const amountColor = isIncoming
            ? theme.positive
            : formattedAmount.includes('-')
            ? theme.negative
            : theme.surfaceContent
          return (
            <span
              css={`
                ${textStyle('body2')};
                color: ${amountColor};
              `}
            >
              {formattedAmount} {symbol}
            </span>
          )
        })()

        return [dateDiv, badgeDiv, typeDiv, referenceDiv, amountDiv]
      }}
      renderEntryActions={({ transactionHash, tokenTransfers }) => {
        const [{ to, from } = {}] = tokenTransfers
        const entity = to || from
        return (
          <ContextMenu>
            <ContextMenuViewTransaction
              theme={theme}
              transactionHash={transactionHash}
              network={network}
            />
            {tokenTransfers.length === 1 && (
              <ContextMenuItemCustomLabel theme={theme} entity={entity} />
            )}
          </ContextMenu>
        )
      }}
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

const ContextMenuItemCustomLabel = ({ entity, theme }) => {
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

const ContextMenuViewTransaction = ({ transactionHash, network, theme }) => {
  const handleViewTransaction = useCallback(() => {
    window.open(
      blockExplorerUrl('transaction', transactionHash, {
        networkType: network && network.type,
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
