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
  theme,
  unselectable,
} from '@aragon/ui'

class Transfers extends React.Component {
  state = {
    displayedTransfers: 10,
  }
  showMoreTransfers = () => {
    this.setState(prevState => ({
      displayedTransfers: prevState.displayedTransfers + 10,
    }))
  }
  render() {
    const { displayedTransfers } = this.state
    const { transfers } = this.props
    return (
      <div>
        <Title>Transfers</Title>
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
          {transfers
            .slice(0, displayedTransfers)
            .map(({ date, ref, amount, token, approvedBy, transaction }) => (
              <TableRow key={transaction}>
                <NoWrapCell>{format(date, 'DD/MM/YY')}</NoWrapCell>
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
                    {amount} {token}
                  </Amount>
                </NoWrapCell>
                <NoWrapCell>
                  <ContextMenu>
                    <ContextMenuItem>
                      <IconShare />
                      Copy URL to share
                    </ContextMenuItem>
                    <ContextMenuItem>
                      <IconShare />
                      See transaction
                    </ContextMenuItem>
                  </ContextMenu>
                </NoWrapCell>
              </TableRow>
            ))}
        </FixedTable>
        {displayedTransfers < transfers.length && (
          <Footer>
            <Button mode="secondary" onClick={this.showMoreTransfers}>
              Show Older Transfers
            </Button>
          </Footer>
        )}
      </div>
    )
  }
}

const Title = styled.h1`
  margin-top: 10px;
  margin-bottom: 20px;
  font-weight: 600;
  font-size: 15px;
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
