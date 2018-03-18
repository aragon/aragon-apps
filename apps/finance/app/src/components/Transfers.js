import React from 'react'
import styled from 'styled-components'
import {
  Button,
  Table,
  TableHeader,
  TableRow,
  DropDown,
  theme,
} from '@aragon/ui'
import TransferRow from './TransferRow'

const TRANSFER_TYPES = ['All', 'Incoming', 'Outgoing']

class Transfers extends React.Component {
  state = {
    selectedToken: 0,
    selectedTransferType: 0,
    displayedTransfers: 10,
  }
  componentDidMount() {
    this.setState({ selectedToken: 0 })
  }
  componentWillReceiveProps() {
    this.setState({ selectedToken: 0 })
  }
  handleTokenChange = index => {
    this.setState({ selectedToken: index, displayedTransfers: 10 })
  }
  handleTransferTypeChange = index => {
    this.setState({ selectedTransferType: index, displayedTransfers: 10 })
  }
  handleResetFilters = () => {
    this.setState({
      selectedTransferType: 0,
      selectedToken: 0,
      displayedTransfers: 10,
    })
  }
  showMoreTransfers = () => {
    this.setState(prevState => ({
      displayedTransfers: prevState.displayedTransfers + 10,
    }))
  }

  // Filter transfer based on the selected filters
  getFilteredTransfers({
    tokens,
    transfers,
    selectedToken,
    selectedTransferType,
  }) {
    return transfers.filter(
      ({ token, amount }) =>
        (selectedToken === 0 || token === tokens[selectedToken - 1]) &&
        (selectedTransferType === 0 ||
          (selectedTransferType === 1 && amount > 0) ||
          (selectedTransferType === 2 && amount < 0))
    )
  }
  render() {
    const {
      displayedTransfers,
      selectedToken,
      selectedTransferType,
    } = this.state
    const { transfers, tokens } = this.props
    const filteredTransfers = this.getFilteredTransfers({
      tokens,
      transfers,
      selectedToken,
      selectedTransferType,
    })
    const filtersActive = selectedToken !== 0 || selectedTransferType !== 0
    return (
      <section>
        <Header>
          <Title>Transfers</Title>
          <div>
            <label>
              <Label>Token:</Label>
              <DropDown
                items={['All', ...tokens]}
                active={selectedToken}
                onChange={this.handleTokenChange}
              />
            </label>
            <label>
              <Label>Transfer type:</Label>
              <DropDown
                items={TRANSFER_TYPES}
                active={selectedTransferType}
                onChange={this.handleTransferTypeChange}
              />
            </label>
          </div>
        </Header>
        {filteredTransfers.length === 0 ? (
          <NoTransfers>
            <p>
              No transfers found.{' '}
              {filtersActive && (
                <a role="button" onClick={this.handleResetFilters}>
                  reset filters
                </a>
              )}
            </p>
          </NoTransfers>
        ) : (
          <div>
            <FixedTable
              header={
                <TableRow>
                  <DateHeader title="Date" />
                  <SourceRecipientHeader title="Source / Recipient" />
                  <ReferenceHeader title="Reference" />
                  <AmountHeader title="Amount" align="right" />
                  <TableHeader />
                </TableRow>
              }
            >
              {filteredTransfers
                .slice(0, displayedTransfers)
                .map(
                  ({ date, ref, amount, token, approvedBy, transaction }) => (
                    <TransferRow
                      date={date}
                      reference={ref}
                      amount={amount}
                      token={token}
                      approvedBy={approvedBy}
                      transaction={transaction}
                      key={transaction}
                    />
                  )
                )}
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
    )
  }
}

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`

const Title = styled.h1`
  margin-top: 10px;
  margin-bottom: 20px;
  font-weight: 600;
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
  display: flex;
  justify-content: center;
  margin-top: 30px;
`

export default Transfers
