import React from 'react'
import styled from 'styled-components'
import copy from 'copy-to-clipboard'
import { format } from 'date-fns/esm'
import {
  TableRow,
  TableCell,
  ContextMenu,
  ContextMenuItem,
  IconTokens,
  SafeLink,
  formatHtmlDatetime,
  theme,
} from '@aragon/ui'
import provideNetwork from '../lib/provideNetwork'
import { formatTokenAmount } from '../lib/utils'
import ConfirmMessage from './ConfirmMessage'

class TransferRow extends React.Component {
  state = {
    showCopyTransferMessage: false,
  }
  handleCopyTransferUrl = () => {
    copy(
      'https://app.aragon.one/#/finance/finance?params=' +
        encodeURIComponent(
          JSON.stringify({
            transaction: this.props.transactionHash,
          })
        )
    )
    this.setState({
      showCopyTransferMessage: true,
    })
  }
  handleViewTransaction = () => {
    const { network: { etherscanBaseUrl }, transactionHash } = this.props
    window.open(`${etherscanBaseUrl}/tx/${transactionHash}`, '_blank')
  }
  handleConfirmMessageDone = () => {
    this.setState({
      showCopyTransferMessage: false,
    })
  }
  render() {
    const {
      amount,
      date,
      decimals,
      entity,
      network: { etherscanBaseUrl },
      reference,
      symbol,
    } = this.props
    const { showCopyTransferMessage } = this.state
    const formattedAmount = formatTokenAmount(amount, decimals, true, {
      rounding: 5,
    })
    const formattedDate = formatHtmlDatetime(date)
    return (
      <TableRow>
        <NoWrapCell>
          <time dateTime={formattedDate} title={formattedDate}>
            {format(date, 'DD/MM/YY')}
          </time>
        </NoWrapCell>
        <NoWrapCell>
          <TextOverflow>
            <SafeLink
              href={`${etherscanBaseUrl}/address/${entity}`}
              target="_blank"
            >
              {entity}
            </SafeLink>
          </TextOverflow>
        </NoWrapCell>
        <NoWrapCell>{reference}</NoWrapCell>
        <NoWrapCell align="right">
          <Amount positive={amount > 0}>
            {formattedAmount} {symbol}
          </Amount>
        </NoWrapCell>
        <NoWrapCell>
          <ActionsWrapper>
            <ContextMenu>
              {/* <ContextMenuItem onClick={this.handleCopyTransferUrl}>
                <IconShare />
                <ActionLabel>Copy Transfer URL</ActionLabel>
              </ContextMenuItem> */}
              <ContextMenuItem onClick={this.handleViewTransaction}>
                <IconTokens />
                <ActionLabel>View Transaction</ActionLabel>
              </ContextMenuItem>
            </ContextMenu>
            {showCopyTransferMessage && (
              <ConfirmMessageWrapper>
                <ConfirmMessage onDone={this.handleConfirmMessageDone}>
                  Transaction URL copied to clipboard
                </ConfirmMessage>
              </ConfirmMessageWrapper>
            )}
          </ActionsWrapper>
        </NoWrapCell>
      </TableRow>
    )
  }
}

const NoWrapCell = styled(TableCell)`
  white-space: nowrap;
`

const TextOverflow = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`

const Amount = styled.span`
  font-weight: 600;
  color: ${({ positive }) => (positive ? theme.positive : theme.negative)};
`

const ActionsWrapper = styled.div`
  position: relative;
`

const ActionLabel = styled.span`
  margin-left: 15px;
`

const ConfirmMessageWrapper = styled.div`
  position: absolute;
  top: 0;
  right: 0;
  z-index: 2;
`

export default provideNetwork(TransferRow)
