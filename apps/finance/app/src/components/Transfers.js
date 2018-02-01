import React from 'react'
import styled from 'styled-components'
import { format } from 'date-fns'
import {
  Button,
  Table,
  TableHeader,
  TableRow,
  TableCell,
  ContextMenu,
  ContextMenuItem,
  IconShare,
  IconTokens,
  DropDown,
  theme,
  unselectable,
} from '@aragon/ui'
import { formatTokenAmount } from '../lib/utils'

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
  showMoreTransfers = () => {
    this.setState(prevState => ({
      displayedTransfers: prevState.displayedTransfers + 10,
    }))
  }
  render() {
    const {
      displayedTransfers,
      selectedToken,
      selectedTransferType,
    } = this.state
    const { transfers, tokens } = this.props
    const filteredTransfers = transfers.filter(
      ({ token, amount }) =>
        (selectedToken === 0 || token === tokens[selectedToken - 1]) &&
        (selectedTransferType === 0 ||
          (selectedTransferType === 1 && amount > 0) ||
          (selectedTransferType === 2 && amount < 0))
    )
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
            .map(({ date, ref, amount, token, approvedBy, transaction }) => (
              <TableRow key={transaction}>
                <NoWrapCell>
                  <time datetime={format(date)} title={format(date)}>
                    {format(date, 'DD/MM/YY')}
                  </time>
                </NoWrapCell>
                <NoWrapCell>
                  <TextOverflow>
                    <a
                      target="_blank"
                      href={`https://etherscan.io/address/${approvedBy}`}
                    >
                      {approvedBy}
                    </a>
                  </TextOverflow>
                </NoWrapCell>
                <NoWrapCell>{ref}</NoWrapCell>
                <NoWrapCell align="right">
                  <Amount positive={amount > 0}>
                    {formatTokenAmount(amount, true)} {token}
                  </Amount>
                </NoWrapCell>
                <NoWrapCell>
                  <ContextMenu>
                    <ContextMenuItem>
                      <IconShare />
                      Copy transfer URL
                    </ContextMenuItem>
                    <ContextMenuItem>
                      <IconTokens />
                      View approval
                    </ContextMenuItem>
                  </ContextMenu>
                </NoWrapCell>
              </TableRow>
            ))}
        </FixedTable>
        {displayedTransfers < filteredTransfers.length && (
          <Footer>
            <Button mode="secondary" onClick={this.showMoreTransfers}>
              Show Older Transfers
            </Button>
          </Footer>
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

const FixedTable = styled(Table)`
  color: rgba(0, 0, 0, 0.75);
`

const NoWrapCell = styled(TableCell)`
  white-space: nowrap;
`

const TextOverflow = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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

const Amount = styled.span`
  font-weight: 600;
  color: ${({ positive }) => (positive ? theme.positive : theme.negative)};
`

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 30px;
`

export default Transfers
