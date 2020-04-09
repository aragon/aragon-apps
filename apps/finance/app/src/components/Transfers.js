import React, { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import { compareDesc, format } from 'date-fns'
import { saveAs } from 'file-saver'
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
import {
  useAragonApi,
  useConnectedAccount,
  useNetwork,
} from '@aragon/api-react'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'
import TransfersFilters from './TransfersFilters'
import { useIdentity } from './IdentityManager/IdentityManager'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import useDownloadData from './useDownloadData'
import useFilteredTransfers from './useFilteredTransfers'

const Transfers = React.memo(({ tokens, transactions }) => {
  const { appState } = useAragonApi()
  const connectedAccount = useConnectedAccount()
  const { layoutName } = useLayout()
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
    symbols,
    transferTypes,
  } = useFilteredTransfers({ transactions, tokens })
  const { isSyncing } = appState
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

  const { handleDownload } = useDownloadData({
    filteredTransfers,
    selectedDateRange,
    tokenDetails,
  })

  const compactMode = layoutName === 'small'

  const sortedTransfers = useMemo(
    () =>
      filteredTransfers.sort(({ date: dateLeft }, { date: dateRight }) =>
        // Sort by date descending
        compareDesc(dateLeft, dateRight)
      ),
    [filteredTransfers, compareDesc]
  )

  const dataViewStatus = useMemo(() => {
    if (emptyResultsViaFilters && transactions.length > 0) {
      return 'empty-filters'
    }
    if (appState.isSyncing) {
      return 'loading'
    }
    return 'default'
  }, [isSyncing, emptyResultsViaFilters, transactions])

  return (
    <DataView
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
      page={page}
      onPageChange={setPage}
      onStatusEmptyClear={handleClearFilters}
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
                ${textStyle('body1')};
              `}
            >
              Transfers
            </div>
            {transactions.length > 0 && (
              <div>
                <Button
                  icon={<IconExternal />}
                  label="Export"
                  onClick={handleDownload}
                />
              </div>
            )}
          </div>
          {!compactMode && (
            <TransfersFilters
              dateRangeFilter={selectedDateRange}
              onDateRangeChange={handleSelectedDateRangeChange}
              onTokenChange={handleTokenChange}
              onTransferTypeChange={handleTransferTypeChange}
              tokenFilter={selectedToken}
              transferTypeFilter={selectedTransferType}
              transferTypes={transferTypes}
              symbols={symbols}
            />
          )}
        </React.Fragment>
      }
      fields={[
        { label: 'Date', priority: 2 },
        { label: 'Source/recipient', priority: 3 },
        { label: 'Reference', priority: 1 },
        { label: 'Amount', priority: 2 },
      ]}
      entries={sortedTransfers}
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
                : ''};
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
          <ContextMenuViewTransaction transactionHash={transactionHash} />
          <ContextMenuItemCustomLabel entity={entity} />
        </ContextMenu>
      )}
    />
  )
})

Transfers.propTypes = {
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

const ContextMenuViewTransaction = ({ transactionHash }) => {
  const theme = useTheme()
  const network = useNetwork()
  const handleViewTransaction = useCallback(() => {
    if (network && network.type) {
      window.open(
        blockExplorerUrl('transaction', transactionHash, {
          networkType: network.type,
        }),
        '_blank',
        'noopener'
      )
    }
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
