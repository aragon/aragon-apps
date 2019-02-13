import React from 'react'
import styled from 'styled-components'
import copy from 'copy-to-clipboard'
import { format } from 'date-fns'
import {
  TableRow,
  TableCell,
  ContextMenu,
  ContextMenuItem,
  IdentityBadge,
  theme,
  BreakPoint,
  breakpoint,
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
    return (
      <React.Fragment>
        <BreakPoint to="medium">{this.renderSmallScreens()}</BreakPoint>
        <BreakPoint from="medium">
          {this.renderMediumAndBiggerScreens()}
        </BreakPoint>
      </React.Fragment>
    )
  }

  renderSmallScreens() {
    const {
      network: { type },
      token: { decimals, symbol },
      transaction: {
        date,
        entity,
        isIncoming,
        numData: { amount },
        reference,
      },
    } = this.props
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
        <StyledTableCell>
          <Grid>
            <div>
              <Wrap>
                <IdentityBadge networkType={type} entity={entity} shorten />
              </Wrap>
            </div>
            <time dateTime={formattedDate} title={formattedDate}>
              {format(date, 'dd MMM yyyy')}
            </time>
            <TextOverflow style={{ marginTop: '5px' }}>
              {reference}
            </TextOverflow>
            <Amount positive={isIncoming} style={{ marginTop: '5px' }}>
              {formattedAmount} {symbol}
            </Amount>
          </Grid>
        </StyledTableCell>
      </TableRow>
    )
  }

  renderMediumAndBiggerScreens() {
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
            {etherscanBaseUrl && (
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
            )}
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

const Wrap = styled.div`
  display: flex;
`

const StyledTableCell = styled(TableCell)`
  &&& {
    border-left-width: 0;
    border-right-width: 0;

    :first-child,
    :last-child {
      border-radius: 0;
    }
  }
`

const Amount = styled.span`
  font-weight: 600;
  color: ${({ positive }) => (positive ? theme.positive : theme.negative)};
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  width: 100%;

  time,
  ${Amount} {
    text-align: right;
  }
`

const NoWrapCell = styled(TableCell)`
  white-space: nowrap;
`

const TextOverflow = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
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
