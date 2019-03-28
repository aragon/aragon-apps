import React from 'react'
import styled from 'styled-components'
import { Spring, animated } from 'react-spring'
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
  DropDown,
  theme,
  breakpoint,
  Viewport,
  springs,
} from '@aragon/ui'
import * as TransferTypes from '../transfer-types'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import TransferRow from './TransferRow'
import ToggleFiltersButton from './ToggleFiltersButton'
import DateRange from './DateRange/DateRangeInput'
import { formatTokenAmount } from '../lib/utils'
import Download from './Download'

const TRANSFER_TYPES = [
  TransferTypes.All,
  TransferTypes.Incoming,
  TransferTypes.Outgoing,
]
const TRANSFER_TYPES_STRING = TRANSFER_TYPES.map(TransferTypes.convertToString)
const TRANSFERS_PER_PAGE = 10

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
    filtersOpened: !this.props.autohide,
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
    return `Finance_(${start}_to_${end}).csv`
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
    const { transactions, tokens, autohide } = this.props
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
      <Viewport>
        {({ below, above }) => (
          <section>
            <Header>
              <Title>
                <span>Transfers </span>
                <span>
                  {below('medium') && (
                    <ToggleFiltersButton
                      title="Toggle Filters"
                      onClick={this.handleToggleFiltersClick}
                    />
                  )}
                </span>
              </Title>
              <Spring
                native
                config={springs.smooth}
                from={{ progress: 0 }}
                to={{ progress: Number(filtersOpened) }}
                immediate={!autohide}
              >
                {({ progress }) => (
                  <Filters
                    style={{
                      overflow: progress.interpolate(v =>
                        v === 1 ? 'unset' : 'hidden'
                      ),
                      height: progress.interpolate(v =>
                        below('medium') ? `${180 * v}px` : 'auto'
                      ),
                    }}
                  >
                    <FilterLabel>
                      <Label>Date range</Label>
                      <WrapDateRange>
                        <DateRange
                          startDate={selectedDateRange.start}
                          endDate={selectedDateRange.end}
                          onChange={this.handleDateRangeChange}
                        />
                      </WrapDateRange>
                    </FilterLabel>
                    <FiltersWrap>
                      <FilterLabel>
                        <Label>Token</Label>
                        <DropDown
                          items={['All', ...symbols]}
                          active={selectedToken}
                          onChange={this.handleTokenChange}
                        />
                      </FilterLabel>
                      <FilterLabel>
                        <Label>Transfer type</Label>
                        <DropDown
                          items={TRANSFER_TYPES_STRING}
                          active={selectedTransferType}
                          onChange={this.handleTransferTypeChange}
                        />
                      </FilterLabel>
                      <FilterLabel>
                        <StyledDownload
                          label="Download"
                          download={this.getCsvFilename()}
                          href={this.encodeDataToCsv(
                            filteredTransfers,
                            tokenDetails
                          )}
                          mode="outline"
                        >
                          <Download label="Download" />
                        </StyledDownload>
                      </FilterLabel>
                    </FiltersWrap>
                  </Filters>
                )}
              </Spring>
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
                <FixedTable
                  header={
                    above('medium') && (
                      <TableRow>
                        <DateHeader title="Date" />
                        <SourceRecipientHeader title="Source / Recipient" />
                        <ReferenceHeader title="Reference" />
                        <AmountHeader title="Amount" align="right" />
                        <TableHeader />
                      </TableRow>
                    )
                  }
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
                        smallViewMode={below('medium')}
                      />
                    ))}
                </FixedTable>
                {displayedTransfers < filteredTransfers.length && (
                  <Footer>
                    <Button mode="secondary" onClick={this.showMoreTransfers}>
                      Show Older Transfers
                    </Button>
                  </Footer>
                )}
              </div>
            )}
          </section>
        )}
      </Viewport>
    )
  }
}

const WrapDateRange = styled.div`
  display: inline-block;
  box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.03);
`

const StyledDownload = styled(Button.Anchor)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  background: #fff;
  box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.03);
`

const Header = styled.div`
  margin-bottom: 10px;

  ${breakpoint(
    'medium',
    `
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      flex-wrap: wrap;
    `
  )};
`

const Filters = styled(animated.div)`
  margin: 0 20px 10px 20px;

  ${breakpoint(
    'medium',
    `
      margin: 0;
      display: inline-flex;
      align-items: baseline;
      justify-content: space-between;
      flex-wrap: wrap;
      margin-right: 0;
      margin-left: auto;
    `
  )};
`

const FilterLabel = styled.label`
  ${breakpoint(
    'medium',
    `
      display: flex;
      flex-wrap: nowrap;
      align-items: center;
      white-space: nowrap;
      margin-right: 16px;
    `
  )};
`

const FiltersWrap = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: unset;
  margin-top: 16px;

  ${FilterLabel}:first-child {
    margin-right: 16px;
  }

  ${breakpoint(
    'medium',
    `
      display: inline-flex;
      align-items: flex-start;
      justify-content: space-between;

      ${FilterLabel}:last-child {
        margin-right: 0;
      }
    `
  )}
`

const Title = styled.h1`
  margin: 20px 20px 10px 20px;
  font-weight: 600;
  display: flex;
  justify-content: space-between;

  ${breakpoint(
    'medium',
    `
      margin: 30px 30px 20px 0;
    `
  )};
`

const Label = styled.span`
  display: block;
  margin-right: 15px;
  font-variant: small-caps;
  text-transform: lowercase;
  color: ${theme.textSecondary};
  font-weight: 600;

  ${breakpoint(
    'medium',
    `
      display: inline;
    `
  )};
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

const FixedTable = styled(Table)`
  color: rgba(0, 0, 0, 0.75);
  margin-bottom: 20px;

  ${breakpoint(
    'medium',
    `
    margin-bottom: 0;
  `
  )};
`

const DateHeader = styled(TableHeader)`
  width: 12%;
`
const SourceRecipientHeader = styled(TableHeader)`
  width: 40%;
`
const ReferenceHeader = styled(TableHeader)`
  width: 100%;
`
const AmountHeader = styled(TableHeader)`
  width: 0;
`

const Footer = styled.div`
  margin-bottom: 30px;
  display: flex;
  justify-content: center;
  margin-top: 30px;

  ${breakpoint(
    'medium',
    `
      margin-bottom: 0;
    `
  )};
`

export default props => (
  <Viewport>
    {({ below }) => <Transfers {...props} autohide={below('medium')} />}
  </Viewport>
)
