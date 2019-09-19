import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { format } from 'date-fns'
import {
  Button,
  ButtonBase,
  ContextMenu,
  ContextMenuItem,
  DataView,
  GU,
  IconArrowDown,
  IconArrowUp,
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
import useTransfers, { SORT_OPTIONS } from './useTransfers'

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
    clearFilters,
    download,
    emptyResultsViaFilters,
    page,
    selectedDateRange,
    selectedToken,
    selectedTransferType,
    setPage,
    setSelectedDateRange,
    setSelectedToken,
    setSelectedTransferType,
    setSort,
    sort,
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
              {
                label: (
                  <SortButton
                    options={[SORT_OPTIONS.DATE.DESC, SORT_OPTIONS.DATE.ASC]}
                    sort={sort}
                    setSort={setSort}
                    compactMode={compactMode}
                  >
                    Date
                  </SortButton>
                ),
                priority: 2,
                align: 'start',
              },
              {
                label: (
                  <SortButton
                    options={[
                      SORT_OPTIONS.SOURCE_RECIPIENT.DESC,
                      SORT_OPTIONS.SOURCE_RECIPIENT.ASC,
                    ]}
                    sort={sort}
                    setSort={setSort}
                    compactMode={compactMode}
                  >
                    Source/recipient
                  </SortButton>
                ),
                priority: 3,
                align: 'start',
              },
              {
                label: (
                  <SortButton
                    options={[
                      SORT_OPTIONS.REFERENCE.DESC,
                      SORT_OPTIONS.REFERENCE.ASC,
                    ]}
                    sort={sort}
                    setSort={setSort}
                    compactMode={compactMode}
                  >
                    Reference
                  </SortButton>
                ),
                priority: 1,
                align: 'start',
              },
              {
                label: (
                  <SortButton
                    options={[
                      SORT_OPTIONS.AMOUNT.DESC,
                      SORT_OPTIONS.AMOUNT.ASC,
                    ]}
                    sort={sort}
                    setSort={setSort}
                    compactMode={compactMode}
                  >
                    Amount
                  </SortButton>
                ),
                priority: 2,
                align: 'start',
              },
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

const SortButton = React.memo(function SortButton({
  children,
  options,
  sort,
  setSort,
  compactMode,
}) {
  const [desc, asc] = options
  const handleClick = useCallback(() => {
    if (sort === desc) {
      setSort(asc)
      return
    }
    setSort(desc)
  }, [options, sort])

  if (compactMode) {
    return children
  }

  return (
    <ButtonBase
      onClick={handleClick}
      css={`
        display: flex;
        align-items: center;
      `}
    >
      <span
        css={`
          margin-right: ${options.includes(sort) ? 1.5 : 0.5 * GU}px;
        `}
      >
        {children}
      </span>
      {options.includes(sort) ? (
        sort === desc ? (
          <IconArrowDown size="tiny" />
        ) : (
          <IconArrowUp size="tiny" />
        )
      ) : null}
    </ButtonBase>
  )
})

const ContextMenuItemCustomLabel = React.memo(
  function ContextMenuItemCustomLabel({ entity }) {
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
)

const ContextMenuViewTransaction = React.memo(
  function ContextMenuViewTransaction({ transactionHash, network }) {
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
)

export default Transfers
