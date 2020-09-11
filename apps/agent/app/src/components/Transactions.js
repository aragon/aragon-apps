import React, { useCallback, useEffect, useMemo } from 'react'
import PropTypes from 'prop-types'
import { compareDesc, format } from 'date-fns'
import styled from 'styled-components'
import {
  useAragonApi,
  useConnectedAccount,
  useNetwork,
} from '@aragon/api-react'
import {
  AppBadge,
  blockExplorerUrl,
  Button,
  ContextMenu,
  ContextMenuItem,
  DataView,
  formatTokenAmount,
  GU,
  IconExternal,
  IconLabel,
  IconToken,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useIdentity } from './IdentityManager/IdentityManager'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import TransactionFilters from './TransactionFilters'
import useDownloadData from './useDownloadData'
import useFilteredTransactions from './useFilteredTransactions'
import { ISO_SHORT_FORMAT, ISO_LONG_FORMAT } from '../lib/date-utils'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import AgentSvg from './assets/agent_badge.svg'

const Transactions = React.memo(function Transactions({
  agentAddress,
  tokens,
  transactions,
}) {
  const { appState } = useAragonApi()
  const connectedAccount = useConnectedAccount()
  const { layoutName } = useLayout()
  const network = useNetwork()
  const theme = useTheme()

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
    symbols,
    transactionTypes,
  } = useFilteredTransactions({ transactions, tokens })

  const transactionLabels = useMemo(() => Object.values(transactionTypes), [
    transactionTypes,
  ])

  const tokenDetails = tokens.reduce(
    (details, { address, decimals, symbol }) => {
      details[toChecksumAddress(address)] = {
        decimals,
        symbol,
      }
      return details
    },
    {}
  )

  const { onDownload } = useDownloadData({
    agentAddress,
    filteredTransactions,
    tokenDetails,
    tokens,
    selectedDateRange,
  })

  const { isSyncing } = appState
  const compactMode = layoutName === 'small'

  const sortedTransactions = useMemo(
    () =>
      filteredTransactions.sort(({ date: dateLeft }, { date: dateRight }) =>
        // Sort by date descending
        compareDesc(dateLeft, dateRight)
      ),
    [filteredTransactions]
  )

  // Reset the filters when switching to the compact view
  useEffect(() => {
    if (compactMode) {
      handleClearFilters()
    }
  }, [compactMode, handleClearFilters])

  const dataViewStatus = useMemo(() => {
    if (emptyResultsViaFilters) {
      return 'empty-filters'
    }
    if (isSyncing) {
      return 'loading'
    }
    return 'default'
  }, [isSyncing, emptyResultsViaFilters])

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
        transactions.length > 0 && (
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
                dateRangeFilter={selectedDateRange}
                onDateRangeChange={handleSelectedDateRangeChange}
                onTokenChange={handleTokenChange}
                onTransactionTypeChange={handleTransactionTypeChange}
                symbols={symbols}
                tokenFilter={selectedToken}
                transactionTypeFilter={selectedTransactionType}
                transactionTypes={transactionLabels}
              />
            )}
            <Button
              icon={<IconExternal />}
              label="Export"
              onClick={onDownload}
            />
          </div>
        )
      }
      onPageChange={setPage}
      onStatusEmptyClear={handleClearFilters}
      page={page}
      status={dataViewStatus}
      statusEmpty={
        <p
          css={`
            ${textStyle('title2')};
          `}
        >
          No transfers yet.
        </p>
      }
      renderEntry={({
        date,
        description: reference,
        type,
        tokenTransfers,
        isIncoming,
        targetContract,
      }) => {
        const [{ token, amount, to, from } = {}] = tokenTransfers
        const onlyOne = tokenTransfers.length === 1
        const entity = to || from
        const formattedDate = format(date, ISO_SHORT_FORMAT)
        const formattedLongDate = format(date, ISO_LONG_FORMAT)
        const isValidEntity =
          typeof targetContract === 'string' && tokenTransfers.length > 0

        const dateNode = (
          <time
            dateTime={formattedDate}
            title={formattedLongDate}
            css={`
              ${textStyle('body2')};
              color: ${theme.surfaceContent};
              white-space: nowrap;
            `}
          >
            {formattedDate}
          </time>
        )
        const badgeNode = onlyOne ? (
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
              entity={entity}
            />
          </div>
        ) : (
          <LocalIdentityBadge
            badgeOnly={isValidEntity}
            entity={!isValidEntity ? targetContract : 'Multiple accounts'}
          />
        )
        const typeNode = (
          <div
            css={`
              ${textStyle('body2')};
              color: ${theme.surfaceContent};
            `}
          >
            {transactionTypes[type]}
          </div>
        )
        const referenceNode = (
          <div
            css={`
              ${textStyle('body2')};
              color: ${theme.surfaceContent};
              padding: ${1 * GU}px 0;
              overflow-wrap: break-word;
              word-break: break-word;
              hyphens: auto;
            `}
          >
            {reference}
          </div>
        )
        const amountNode = (() => {
          if (!onlyOne) {
            const uniqueTokens = new Set(
              tokenTransfers.map(({ token }) => token)
            ).size
            return (
              <div
                css={`
                  ${textStyle('body2')};
                  color: ${theme.surfaceContent};
                `}
              >
                {uniqueTokens}&nbsp;token
                {uniqueTokens > 1 || uniqueTokens === 0 ? 's' : ''}
              </div>
            )
          }

          const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
          const formattedAmount = formatTokenAmount(
            isIncoming ? amount : amount.neg(),
            decimals,
            { displaySign: true, digits: 5, symbol }
          )
          const amountColor = isIncoming ? theme.positive : theme.negative
          return (
            <span
              css={`
                ${textStyle('body2')};
                color: ${amountColor};
              `}
            >
              {formattedAmount}
            </span>
          )
        })()

        return [dateNode, badgeNode, typeNode, referenceNode, amountNode]
      }}
      renderEntryActions={({ transactionHash, tokenTransfers }) => {
        const [{ to, from } = {}] = tokenTransfers
        const entity = to || from
        return (
          <ContextMenu>
            <ContextMenuViewTransaction
              transactionHash={transactionHash}
              network={network}
            />
            {tokenTransfers.length === 1 && (
              <ContextMenuItemCustomLabel entity={entity} />
            )}
          </ContextMenu>
        )
      }}
      renderEntryExpansion={({ tokenTransfers }) => {
        if (tokenTransfers.length <= 1) {
          return null
        }

        const transfers = tokenTransfers.map(({ to, from, amount, token }) => {
          const isIncoming = Boolean(from)
          const { symbol, decimals } = tokenDetails[toChecksumAddress(token)]
          const formattedAmount = formatTokenAmount(
            isIncoming ? amount : amount.neg(),
            decimals,
            { displaySign: true, digits: 5, symbol }
          )
          const amountColor = isIncoming ? theme.positive : theme.negative

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
              <BadgeContainer
                surfaceColor={theme.surfaceContentSecondary}
                compactMode={compactMode}
              >
                From{' '}
                <div>
                  {!from ? (
                    <AppBadge
                      appAddress={agentAddress}
                      iconSrc={AgentSvg}
                      label="Agent"
                    />
                  ) : (
                    <LocalIdentityBadge entity={from} />
                  )}
                </div>
              </BadgeContainer>
              <BadgeContainer
                surfaceColor={theme.surfaceContentSecondary}
                compactMode={compactMode}
              >
                To{' '}
                <div>
                  {!to ? (
                    <AppBadge
                      appAddress={agentAddress}
                      iconSrc={AgentSvg}
                      label="Agent"
                    />
                  ) : (
                    <LocalIdentityBadge entity={to} />
                  )}
                </div>
              </BadgeContainer>
              <div
                css={`
                  text-align: right;
                  ${compactMode &&
                    `
                      display: flex;
                      flex-direction: row;
                      align-items: space-between;
                      justify-content: space-between;
                      width: 100%;
                      margin-right: ${5 * GU}px;
                  `}
                `}
              >
                {compactMode && (
                  <span
                    css={`
                      color: ${theme.surfaceContentSecondary};
                      ${textStyle('label2')};
                      font-weight: 400;
                    `}
                  >
                    Amount
                  </span>
                )}
                <span
                  css={`
                    color: ${amountColor};
                  `}
                >
                  {formattedAmount}
                </span>
              </div>
            </div>
          )
        })

        return compactMode ? (
          <div css="width: 100%">{transfers}</div>
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

function ContextMenuItemCustomLabel({ entity }) {
  const theme = useTheme()
  const [label, showLocalIdentityModal] = useIdentity(entity)
  const handleEditLabel = useCallback(() => showLocalIdentityModal(entity), [
    showLocalIdentityModal,
    entity,
  ])

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

function ContextMenuViewTransaction({ transactionHash, network }) {
  const theme = useTheme()
  const href = blockExplorerUrl('transaction', transactionHash, {
    networkType: network && network.type,
  })
  return (
    <ContextMenuItem href={href}>
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

const BadgeContainer = styled.div`
  color: ${({ surfaceColor }) => surfaceColor};
  ${textStyle('label2')};
  font-weight: 400;
  display: inline-grid;
  grid-template-columns: auto 1fr;
  grid-gap: ${1 * GU}px;
  align-items: center;
  width: ${25 * GU}px;
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

export default Transactions
