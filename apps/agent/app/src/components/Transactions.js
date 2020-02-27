import React, { useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { compareDesc, format } from 'date-fns'
import {
  AppBadge,
  blockExplorerUrl,
  Button,
  ContextMenu,
  ContextMenuItem,
  DataView,
  GU,
  IconExternal,
  IconToken,
  IconLabel,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useConnectedAccount, useNetwork } from '@aragon/api-react'
import AgentSvg from './assets/agent_badge.svg'
import EmptyTransactions from './EmptyTransactions'
import { useIdentity } from './IdentityManager/IdentityManager'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import TransactionFilters from './TransactionFilters'
import {
  TRANSACTION_TYPES_LABELS,
  TRANSACTION_TYPES_STRING,
} from '../transaction-types'
import useFilteredTransactions from './useFilteredTransactions'
import useDownloadData from './useDownloadData'
import { formatTokenAmount } from '../lib/utils'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'

const getTokenDetails = (details, { address, decimals, symbol }) => {
  details[toChecksumAddress(address)] = {
    decimals,
    symbol,
  }
  return details
}

const Transactions = React.memo(function Transactions({
  agentAddress,
  tokens,
  transactions,
}) {
  const connectedAccount = useConnectedAccount()
  const { layoutName } = useLayout()
  const network = useNetwork()
  const theme = useTheme()
  const compactMode = layoutName === 'small'
  const {
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
  } = useFilteredTransactions({ transactions, tokens })
  const tokenDetails = tokens.reduce(getTokenDetails, {})
  const { onDownload } = useDownloadData({
    filteredTransactions,
    tokenDetails,
    tokens,
    selectedDateRange,
  })
  const symbols = tokens.map(({ symbol }) => symbol)

  const sortedTransactions = useMemo(
    () =>
      filteredTransactions.sort(({ date: dateLeft }, { date: dateRight }) =>
        // Sort by date descending
        compareDesc(dateLeft, dateRight)
      ),
    [filteredTransactions]
  )

  if (!transactions.length) {
    return <EmptyTransactions />
  }

  return (
    <DataView
      entries={sortedTransactions}
      fields={
        emptyResultsViaFilters
          ? []
          : [
              { label: 'Date', priority: 2 },
              { label: 'Source/recipient', priority: 5, childStart: true },
              { label: 'Type', priority: 3 },
              { label: 'Reference', priority: 1 },
              { label: 'Amount', priority: 4 },
            ]
      }
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
            {!compactMode && (
              <TransactionFilters
                compactMode={compactMode}
                dateRangeFilter={selectedDateRange}
                onDateRangeChange={handleSelectedDateRangeChange}
                onTokenChange={handleTokenChange}
                onTransactionTypeChange={handleTransactionTypeChange}
                symbols={['All tokens', ...symbols]}
                tokenFilter={selectedToken}
                transactionTypeFilter={selectedTransactionType}
                transactionTypes={TRANSACTION_TYPES_STRING}
              />
            )}
            <div css="text-align: right;">
              <Button
                icon={<IconExternal />}
                label="Export"
                onClick={onDownload}
              />
            </div>
          </div>
        </React.Fragment>
      }
      onPageChange={setPage}
      onStatusEmptyClear={handleClearFilters}
      page={page}
      status={emptyResultsViaFilters ? 'empty-filters' : 'default'}
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
              typeof targetContract === 'string' && network ? network.type : ''
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
      renderEntryExpansion={({ tokenTransfers }) => {
        if (tokenTransfers.length === 1) {
          return
        }

        const transfers = tokenTransfers.map(({ to, from, amount, token }) => {
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
              key={to || from}
              css={`
                width: 100%;
                display: grid;
                grid-template-columns: auto auto 1fr;
                grid-gap: ${3 * GU}px;
                align-items: center;
                justify-content: space-between;
                ${compactMode &&
                  `
                width: 100%;
                display: flex;
                flex-direction: column
                align-items: flex-end;
                justify-content: space-between;
                margin-top: ${5 * GU}px;
                margin-left: ${4 * GU}px;
                margin-bottom: ${5 * GU}px;
              `}
              `}
            >
              <InnerEntryColumn compactMode={compactMode} theme={theme}>
                From{' '}
                {!from ? (
                  <AppBadge
                    appAddress={agentAddress}
                    iconSrc={AgentSvg}
                    label="Agent"
                  />
                ) : (
                  <LocalIdentityBadge
                    entity={from || 'Agent'}
                    badgeOnly={!from}
                  />
                )}
              </InnerEntryColumn>
              <InnerEntryColumn compactMode={compactMode} theme={theme}>
                To{' '}
                {!to ? (
                  <AppBadge
                    appAddress={agentAddress}
                    iconSrc={AgentSvg}
                    label="Agent"
                  />
                ) : (
                  <LocalIdentityBadge entity={to || 'Agent'} badgeOnly={!to} />
                )}
              </InnerEntryColumn>
              <AmountColumn
                amountColor={amountColor}
                compactMode={compactMode}
                theme={theme}
              >
                {compactMode && <span className="amount-label">Amount</span>}
                <span className="token-amount">
                  {' '}
                  {formattedAmount} {symbol}
                </span>
              </AmountColumn>
            </div>
          )
        })
        return compactMode ? (
          <div
            css={`
              width: 100%;
            `}
          >
            {transfers}
          </div>
        ) : (
          transfers
        )
      }}
    />
  )
})

Transactions.propTypes = {
  tokens: PropTypes.array.isRequired,
  transactions: PropTypes.array.isRequired,
}

const InnerEntryColumn = styled.div`
  color: ${({ theme }) => theme.surfaceContentSecondary};
  ${textStyle('label2')};
  font-weight: 400;
  display: inline-grid;
  grid-template-columns: auto 1fr;
  grid-gap: ${1 * GU}px;
  align-items: center;
  width: 200px;
  ${({ compactMode }) =>
    compactMode &&
    `
      display: flex;
      flex-direction: row;
      align-items: space-between;
      justify-content: space-between;
      width: 100%;
      margin-right: ${5 * GU}px;
      margin-bottom: ${5 * GU}px;
    `};
`

const AmountColumn = styled.div`
  text-align: right;
  .amount-label {
    color: ${({ theme }) => theme.surfaceContentSecondary};
    ${textStyle('label2')};
    font-weight: 400;
  }
  .token-amount {
    color: ${({ amountColor }) => amountColor};
  }
  ${({ compactMode }) =>
    compactMode &&
    `
      display: flex;
      display: flex;
      flex-direction: row;
      align-items: space-between;
      justify-content: space-between;
      width: 100%;
      margin-right: ${5 * GU}px;
    `}
`

function ContextMenuItemCustomLabel({ entity, theme }) {
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

function ContextMenuViewTransaction({ transactionHash, network, theme }) {
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

export default Transactions
