import React from 'react'
import styled from 'styled-components'
import copy from 'copy-to-clipboard'
import { format } from 'date-fns'
import {
  TableRow,
  TableCell,
  ContextMenu,
  ContextMenuItem,
  SafeLink,
  IdentityBadge,
  theme,
} from '@aragon/ui'
import provideNetwork from '../lib/provideNetwork'
import { formatTokenAmount } from '../lib/utils'
import IconTokens from './icons/IconTokens'
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
            transaction: this.props.transaction.transactionHash,
          })
        )
    )
    this.setState({
      showCopyTransferMessage: true,
    })
  }
  handleViewTransaction = () => {
    const {
      network: { etherscanBaseUrl },
      transaction: { transactionHash },
    } = this.props
    window.open(`${etherscanBaseUrl}/tx/${transactionHash}`, '_blank')
  }
  handleConfirmMessageDone = () => {
    this.setState({
      showCopyTransferMessage: false,
    })
  }
  render() {
    const { network, token, transaction, wideMode } = this.props
    const { showCopyTransferMessage } = this.state
    const { etherscanBaseUrl } = network
    const {
      date,
      entity,
      isIncoming,
      numData: { amount },
      reference,
    } = transaction
    const { decimals, symbol } = token
    const formattedAmount = formatTokenAmount(
      amount,
      isIncoming,
      decimals,
      true,
      { rounding: 5 }
    )
    const formattedDate = format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")
    return (
      <TableRow>
        <NoWrapCell>
          <time dateTime={formattedDate} title={formattedDate}>
            {format(date, 'dd/MM/yy')}
          </time>
        </NoWrapCell>
        <NoWrapCell>
          <IdentityBadge
            networkType={network.type}
            entity={entity}
            shorten={!wideMode}
          />
        </NoWrapCell>
        <NoWrapCell title={reference} style={{ position: 'relative' }}>
          <TextOverflow style={{ position: 'absolute', left: '0', right: '0' }}>
            {reference}
          </TextOverflow>
        </NoWrapCell>
        <NoWrapCell align="right">
          <Amount positive={isIncoming}>
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
              {etherscanBaseUrl && (
                <ContextMenuItem onClick={this.handleViewTransaction}>
                  <IconTokens />
                  <ActionLabel>View Transaction</ActionLabel>
                </ContextMenuItem>
              )}
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
