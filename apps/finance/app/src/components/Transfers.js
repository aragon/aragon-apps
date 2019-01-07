import React from 'react'
import styled from 'styled-components'
import { compareDesc } from 'date-fns'
import {
  Button,
  Table,
  TableHeader,
  TableRow,
  DropDown,
  theme,
  breakpoint,
  BreakPoint,
} from '@aragon/ui'
import * as TransferTypes from '../transfer-types'
import { addressesEqual, toChecksumAddress } from '../lib/web3-utils'
import TransferRow from './TransferRow'
import GetWindowSize from './GetWindowSize'

const TRANSFER_TYPES = [
  TransferTypes.All,
  TransferTypes.Incoming,
  TransferTypes.Outgoing,
]
const TRANSFER_TYPES_STRING = TRANSFER_TYPES.map(TransferTypes.convertToString)
const TRANSFERS_PER_PAGE = 10

const initialState = {
  selectedToken: 0,
  selectedTransferType: 0,
  displayedTransfers: TRANSFERS_PER_PAGE,
}

class Transfers extends React.Component {
  state = {
    ...initialState,
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
  }) {
    const transferType = TRANSFER_TYPES[selectedTransferType]
    return transactions.filter(
      ({ token, isIncoming }) =>
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
      selectedToken,
      selectedTransferType,
    } = this.state
    const { transactions, tokens } = this.props
    const filteredTransfers = this.getFilteredTransfers({
      tokens,
      transactions,
      selectedToken,
      selectedTransferType,
    })
    const symbols = tokens.map(({ symbol }) => symbol)
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
    const filtersActive = selectedToken !== 0 || selectedTransferType !== 0
    return (
      <section>
        <Header>
          <Title>Transfers</Title>
          {filteredTransfers.length > 0 && (
            <Filters>
              <FilterLabel>
                <Label>Token:</Label>
                <DropDown
                  items={['All', ...symbols]}
                  active={selectedToken}
                  onChange={this.handleTokenChange}
                />
              </FilterLabel>
              <FilterLabel>
                <Label>Transfer type:</Label>
                <DropDown
                  items={TRANSFER_TYPES_STRING}
                  active={selectedTransferType}
                  onChange={this.handleTransferTypeChange}
                />
              </FilterLabel>
            </Filters>
          )}
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
            <GetWindowSize>
              {({ width }) => (
                <FixedTable
                  header={
                    <BreakPoint from="medium">
                      <TableRow>
                        <DateHeader title="Date" />
                        <SourceRecipientHeader title="Source / Recipient" />
                        <ReferenceHeader title="Reference" />
                        <AmountHeader title="Amount" align="right" />
                        <TableHeader />
                      </TableRow>
                    </BreakPoint>
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
                        wideMode={width > (768 + 219)}
                      />
                    ))}
                </FixedTable>
              )}
            </GetWindowSize>
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
    )
  }
}

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  flex-wrap: nowrap;
  margin-bottom: 10px;
`

const Filters = styled.div`
  display: none;

  ${breakpoint(
    'medium',
    `
      display: flex;
      flex-wrap: nowrap;
    `
  )};
`

const FilterLabel = styled.label`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  white-space: nowrap;
`

const Title = styled.h1`
  margin: 20px 0 20px 30px;
  font-weight: 600;

  ${breakpoint(
    'medium',
    `
      margin-top: 10px;
      margin-left: 0;
    `
  )};
`

const Label = styled.span`
  margin-right: 15px;
  margin-left: 20px;
  font-variant: small-caps;
  text-transform: lowercase;
  color: ${theme.textSecondary};
  font-weight: 600;
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

  ${breakpoint('medium', `
    margin-bottom: 0;
  `)}
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

export default Transfers
