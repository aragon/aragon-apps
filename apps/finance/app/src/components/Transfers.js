import React from 'react'
import styled from 'styled-components'
import {
  compareDesc,
  endOfDay,
  format,
  isWithinInterval,
  startOfDay,
} from 'date-fns'
import {
  Button,
  Table,
  TableHeader,
  TableRow,
  useViewport,
  theme,
} from '@aragon/ui'
import * as TransferTypes from '../transfer-types'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'
import TransferRow from './TransferRow'
import ToggleFiltersButton from './ToggleFiltersButton'
import TransfersFilters from './TransfersFilters'
import { IdentityContext } from './IdentityManager/IdentityManager'

const TRANSFER_TYPES = [
  TransferTypes.All,
  TransferTypes.Incoming,
  TransferTypes.Outgoing,
]
const INITIAL_TRANSFERS_PER_PAGE = 10
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
  tokens,
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
      (selectedToken === 0 ||
        addressesEqual(token, tokens[selectedToken - 1].address)) &&
      (transferType === TransferTypes.All ||
        (transferType === TransferTypes.Incoming && isIncoming) ||
        (transferType === TransferTypes.Outgoing && !isIncoming))
  )
}

const Transfers = React.memo(({ tokens, transactions }) => {
  const { below } = useViewport()
  const compactMode = below('medium')
  const [filtersOpened, setFiltersOpened] = React.useState(!compactMode)
  const [selectedToken, setSelectedToken] = React.useState(0)
  const [displayedTransfers, setDisplayedTransfers] = React.useState(
    INITIAL_TRANSFERS_PER_PAGE
  )
  const [selectedTransferType, setSelectedTransferType] = React.useState(0)
  const [selectedDateRange, setSelectedDateRange] = React.useState({
    start: null,
    end: null,
  })

  const handleToggleFiltersClick = React.useCallback(() => {
    setFiltersOpened(!filtersOpened)
  })
  const handleTokenChange = React.useCallback(index => {
    setSelectedToken(index)
    setDisplayedTransfers(INITIAL_TRANSFERS_PER_PAGE)
  })
  const handleTransferTypeChange = React.useCallback(index => {
    setSelectedTransferType(index)
    setDisplayedTransfers(INITIAL_TRANSFERS_PER_PAGE)
  })
  const handleResetFilters = React.useCallback(() => {
    setDisplayedTransfers(INITIAL_TRANSFERS_PER_PAGE)
    setSelectedToken(0)
    setSelectedTransferType(0)
  })
  const getCsvFilename = React.useCallback(() => {
    let filename = 'transfers.csv'
    const { start, end } = selectedDateRange
    if (start && end) {
      const formattedStart = format(selectedDateRange.start, 'yyyy-MM-dd')
      const formattedEnd = format(selectedDateRange.end, 'yyyy-MM-dd')
      filename = `transfers_${formattedStart}_to_${formattedEnd}.csv`
    }
    return filename
  })
  const showMoreTransfers = React.useCallback(() => {
    setDisplayedTransfers(displayedTransfers + INITIAL_TRANSFERS_PER_PAGE)
  })
  const filteredTransfers = getFilteredTransfers({
    tokens,
    transactions,
    selectedToken,
    selectedTransferType,
    selectedDateRange,
  })
  const symbols = tokens.map(({ symbol }) => symbol)
  const tokenDetails = tokens.reduce(getTokenDetails, {})
  const filtersActive = selectedToken !== 0 || selectedTransferType !== 0
  const { resolve: resolveAddress } = React.useContext(IdentityContext)
  const getDownloadData = async () => {
    const mappedData = await Promise.all(
      filteredTransfers.map(
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
          )},${name},${entity},${reference},${`${formattedAmount} ${symbol}`}`
        }
      )
    )
    const csvContent = [
      'data:text/csv;charset=utf-8,Date,Name,Source/Recipient,Reference,Amount',
    ]
      .concat(mappedData)
      .join('\n')

    return window.encodeURI(csvContent)
  }

  return (
    <section>
      <Header>
        <Title compactMode={compactMode}>
          <span>Transfers </span>
          <span>
            {compactMode && (
              <ToggleFiltersButton
                title="Toggle Filters"
                onClick={handleToggleFiltersClick}
                css="margin-right: -5px"
              />
            )}
          </span>
        </Title>
        <TransfersFilters
          dateRangeFilter={selectedDateRange}
          onDateRangeChange={setSelectedDateRange}
          tokenFilter={selectedToken}
          onTokenChange={handleTokenChange}
          transferTypeFilter={selectedTransferType}
          onTransferTypeChange={handleTransferTypeChange}
          compactMode={compactMode}
          opened={filtersOpened}
          symbols={symbols}
          transferTypes={TRANSFER_TYPES_STRING}
          downloadFileName={getCsvFilename()}
          onDownloadData={getDownloadData}
        />
      </Header>
      {filteredTransfers.length === 0 ? (
        <NoTransfers compactMode={compactMode}>
          <p css="text-align: center">
            No transfers match your filter{' '}
            {selectedDateRange.start &&
              `and period (${formatDate(
                selectedDateRange.start
              )} to ${formatDate(selectedDateRange.end)}) selection. `}
            {filtersActive && (
              <a role="button" onClick={handleResetFilters}>
                Clear filters
              </a>
            )}
          </p>
        </NoTransfers>
      ) : (
        <div>
          <Table
            compactMode={compactMode}
            header={
              !compactMode && (
                <TableRow>
                  <TableHeader title="Date" css="width: 12%" />
                  <TableHeader title="Source / Recipient" css="width: 40%" />
                  <TableHeader title="Reference" css="width: 100%" />
                  <TableHeader title="Amount" align="right" css="width: 0" />
                  <TableHeader />
                </TableRow>
              )
            }
            css={`
              color: ${theme.textPrimary};
              margin-bottom: 20px;
            `}
          >
            {filteredTransfers
              .sort(({ date: dateLeft }, { date: dateRight }) =>
                // Sort by date descending
                compareDesc(dateLeft, dateRight)
              )
              .slice(0, displayedTransfers)
              .map(transfer => (
                <TransferRow
                  key={transfer.transactionHash}
                  token={tokenDetails[toChecksumAddress(transfer.token)]}
                  transaction={transfer}
                  smallViewMode={compactMode}
                />
              ))}
          </Table>
          {displayedTransfers < filteredTransfers.length && (
            <Footer compactMode={compactMode}>
              <Button mode="secondary" onClick={showMoreTransfers}>
                Show Older Transfers
              </Button>
            </Footer>
          )}
        </div>
      )}
    </section>
  )
})

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  margin-bottom: 10px;
`

const Title = styled.h1`
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-weight: 600;
  margin: ${p => (p.compactMode ? '20px 20px 10px 20px' : '30px 30px 20px 0')};
`
const NoTransfers = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: ${theme.contentBackground};
  border: 1px solid ${theme.contentBorder};
  border-radius: ${p => (p.compactMode ? '0' : '3px')};
  margin-bottom: ${p => (p.compactMode ? '20px' : '0')};
  padding: 20px;
  a {
    text-decoration: underline;
    color: ${theme.accent};
    cursor: pointer;
  }
`

const Footer = styled.div`
  margin-bottom: ${p => (p.compactMode ? '30px' : '0')};
  display: flex;
  justify-content: center;
  margin-top: 30px;
`

export default Transfers
