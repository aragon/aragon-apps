import React from 'react'
import styled from 'styled-components'
import {
  compareDesc,
  addDays,
  addMonths,
  getMonth,
  getYear,
  format,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from 'date-fns'
import {
  Button,
  Table,
  TableHeader,
  TableRow,
  Viewport,
  theme,
} from '@aragon/ui'
import * as TransferTypes from '../transfer-types'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import { formatTokenAmount } from '../lib/utils'
import TransferRow from './TransferRow'
import ToggleFiltersButton from './ToggleFiltersButton'
import TransfersFilters from './TransfersFilters'

const TRANSFER_TYPES = [
  TransferTypes.All,
  TransferTypes.Incoming,
  TransferTypes.Outgoing,
]
const TRANSFERS_PER_PAGE = 10
const TRANSFER_TYPES_STRING = TRANSFER_TYPES.map(TransferTypes.convertToString)

const reduceTokenDetails = (details, { address, decimals, symbol }) => {
  details[toChecksumAddress(address)] = {
    decimals,
    symbol,
  }
  return details
}

const getCurrentMonthRange = () => {
  const now = Date.now()
  const month = getMonth(now)
  const year = getYear(now)
  const start = new Date(year, month, 1)
  const end = addDays(addMonths(start, 1), -1)
  return { start, end }
}

const initialState = {
  selectedDateRange: getCurrentMonthRange(),
  selectedToken: 0,
  selectedTransferType: 0,
  displayedTransfers: TRANSFERS_PER_PAGE,
}

class Transfers extends React.PureComponent {
  state = {
    ...initialState,
    filtersOpened: !this.props.compactMode,
  }

  handleToggleFiltersClick = () => {
    this.setState(({ filtersOpened }) => ({ filtersOpened: !filtersOpened }))
  }
  handleTokenChange = index => {
    this.setState({
      selectedToken: index,
      displayedTransfers: TRANSFERS_PER_PAGE,
    })
  }
  handleTransferTypeChange = index => {
    this.setState({
      selectedTransferType: index,
      displayedTransfers: TRANSFERS_PER_PAGE,
    })
  }
  handleResetFilters = () => {
    this.setState({
      ...initialState,
    })
  }
  handleDateRangeChange = selectedDateRange => {
    this.setState({ selectedDateRange })
  }
  encodeDataToCsv = (data, tokenDetails) => {
    const csvContent = [
      'data:text/csv;charset=utf-8,Date,Source/Recipient,Reference,Amount',
    ]
      .concat(
        data.map(
          ({
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
            return `${format(
              date,
              'dd/MM/yy'
            )},${entity},${reference},${`${formattedAmount} ${symbol}`}`
          }
        )
      )
      .join('\n')
    return window.encodeURI(csvContent)
  }
  getCsvFilename = () => {
    const { selectedDateRange } = this.state
    const start = format(selectedDateRange.start, 'yyyy-MM-dd')
    const end = format(selectedDateRange.end, 'yyyy-MM-dd')
    return `transfers_${start}_to_${end}.csv`
  }
  showMoreTransfers = () => {
    this.setState(prevState => ({
      displayedTransfers: prevState.displayedTransfers + TRANSFERS_PER_PAGE,
    }))
  }

  // Filter transfer based on the selected filters
  getFilteredTransfers({
    tokens,
    transactions,
    selectedToken,
    selectedTransferType,
    selectedDateRange,
  }) {
    const transferType = TRANSFER_TYPES[selectedTransferType]
    return transactions.filter(
      ({ token, isIncoming, date }) =>
        isWithinInterval(new Date(date), {
          start: startOfDay(selectedDateRange.start),
          end: endOfDay(selectedDateRange.end),
        }) &&
        (selectedToken === 0 ||
          addressesEqual(token, tokens[selectedToken - 1].address)) &&
        (transferType === TransferTypes.All ||
          (transferType === TransferTypes.Incoming && isIncoming) ||
          (transferType === TransferTypes.Outgoing && !isIncoming))
    )
  }
  render() {
    const {
      displayedTransfers,
      filtersOpened,
      selectedDateRange,
      selectedToken,
      selectedTransferType,
    } = this.state
    const { compactMode, tokens, transactions } = this.props
    const filteredTransfers = this.getFilteredTransfers({
      tokens,
      transactions,
      selectedToken,
      selectedTransferType,
      selectedDateRange,
    })
    const symbols = tokens.map(({ symbol }) => symbol)
    const tokenDetails = tokens.reduce(reduceTokenDetails, {})
    const filtersActive = selectedToken !== 0 || selectedTransferType !== 0

    return (
      <section>
        <Header>
          <Title compactMode={compactMode}>
            <span>Transfers </span>
            <span>
              {compactMode && (
                <ToggleFiltersButton
                  title="Toggle Filters"
                  onClick={this.handleToggleFiltersClick}
                />
              )}
            </span>
          </Title>
          <TransfersFilters
            dateRangeFilter={selectedDateRange}
            onDateRangeChange={this.handleDateRangeChange}
            tokenFilter={selectedToken}
            onTokenChange={this.handleTokenChange}
            transferTypeFilter={selectedTransferType}
            onTransferTypeChange={this.handleTransferTypeChange}
            compactMode={compactMode}
            opened={filtersOpened}
            symbols={symbols}
            transferTypes={TRANSFER_TYPES_STRING}
            downloadFileName={this.getCsvFilename()}
            downloadUrl={this.encodeDataToCsv(filteredTransfers, tokenDetails)}
          />
        </Header>
        {filteredTransfers.length === 0 ? (
          <NoTransfers>
            <p>
              No transfers found.{' '}
              {filtersActive && (
                <a role="button" onClick={this.handleResetFilters}>
                  Reset filters
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
                <Button mode="secondary" onClick={this.showMoreTransfers}>
                  Show Older Transfers
                </Button>
              </Footer>
            )}
          </div>
        )}
      </section>
    )
  }
}

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
  border-radius: 3px;
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

export default props => (
  <Viewport>
    {({ below }) => <Transfers {...props} compactMode={below('medium')} />}
  </Viewport>
)
