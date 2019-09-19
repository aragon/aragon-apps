import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { format } from 'date-fns'
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
import * as TransferTypes from '../../transfer-types'
import { addressesEqual, toChecksumAddress } from '../../lib/web3-utils'
import { formatTokenAmount } from '../../lib/utils'
import TransfersFilters from './TransfersFilters'
import EmptyFilteredTransfers from './EmptyFilteredTransfers'
import EmptyTransactions from './EmptyTransactions'
import { useIdentity } from '../IdentityManager/IdentityManager'
import LocalIdentityBadge from '../LocalIdentityBadge/LocalIdentityBadge'
import useTransfers from './useTransfers'

const TRANSFER_TYPES = [
  TransferTypes.All,
  TransferTypes.Incoming,
  TransferTypes.Outgoing,
]
const TRANSFER_TYPES_STRING = TRANSFER_TYPES.map(TransferTypes.convertToString)

const Transfers = React.memo(({ tokens, transactions }) => {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'
  const network = useNetwork()
  const connectedAccount = useConnectedAccount()
  const {
    emptyResultsViaFilters,
    clearFilters,
    download,
    page,
    selectedDateRange,
    setSelectedDateRange,
    selectedToken,
    setSelectedToken,
    selectedTransferType,
    setSelectedTransferType,
    setPage,
    sortedTransfers,
    symbols,
    tokenDetails,
  } = useTransfers({
    tokens,
    transactions,
  })

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
                ${textStyle('body1')};
              `}
            >
              Transfers
            </div>
            <div css="text-align: right;">
              <Button onClick={download}>
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
              onDateRangeChange={setSelectedDateRange}
              tokenFilter={selectedToken}
              onTokenChange={setSelectedToken}
              transferTypeFilter={selectedTransferType}
              onTransferTypeChange={setSelectedTransferType}
              compactMode={compactMode}
              symbols={['All tokens', ...symbols]}
              transferTypes={TRANSFER_TYPES_STRING}
            />
          )}
          {emptyResultsViaFilters && (
            <EmptyFilteredTransfers onClear={clearFilters} />
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
  const handleViewTransaction = useCallback(
    () => {
      window.open(
        blockExplorerUrl('transaction', transactionHash, {
          networkType: network.type,
        }),
        '_blank',
        'noopener'
      )
    }, [transactionHash, network]
  )

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
