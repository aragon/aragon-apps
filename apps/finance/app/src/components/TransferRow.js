import React from 'react'
import styled from 'styled-components'
import { format } from 'date-fns'
import {
  TableRow,
  TableCell,
  ContextMenu,
  ContextMenuItem,
  IdentityBadge,
  theme,
  breakpoint,
  Viewport,
} from '@aragon/ui'
import provideNetwork from '../lib/provideNetwork'
import { formatTokenAmount } from '../lib/utils'
import IconTokens from './icons/IconTokens'

class TransferRow extends React.PureComponent {
  handleViewTransaction = () => {
    const {
      network: { etherscanBaseUrl },
      transaction: { transactionHash },
    } = this.props
    window.open(`${etherscanBaseUrl}/tx/${transactionHash}`, '_blank')
  }

  render() {
    const {
      network,
      token,
      smallViewMode,
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
      token.decimals,
      true,
      { rounding: 5 }
    )
    const formattedDate = format(date, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")

    if (smallViewMode) {
      return (
        <TableRow>
          <StyledTableCell>
            <Grid>
              <div>
                <div css="display: flex">
                  <IdentityBadge networkType={network.type} entity={entity} />
                </div>
              </div>
              <time dateTime={formattedDate} title={formattedDate}>
                {format(date, 'dd MMM yyyy')}
              </time>
              <TextOverflow style={{ marginTop: '5px' }}>
                {reference}
              </TextOverflow>
              <Amount positive={isIncoming} style={{ marginTop: '5px' }}>
                {formattedAmount} {token.symbol}
              </Amount>
            </Grid>
          </StyledTableCell>
        </TableRow>
      )
    }

    return (
      <TableRow>
        <NoWrapCell>
          <time dateTime={formattedDate} title={formattedDate}>
            {format(date, 'dd/MM/yy')}
          </time>
        </NoWrapCell>
        <NoWrapCell>
          <IdentityBadge networkType={network.type} entity={entity} />
        </NoWrapCell>
        <NoWrapCell title={reference} style={{ position: 'relative' }}>
          <TextOverflow
            style={{ position: 'absolute', left: '20px', right: '20px' }}
          >
            {reference}
          </TextOverflow>
        </NoWrapCell>
        <NoWrapCell align="right">
          <Amount positive={isIncoming}>
            {formattedAmount} {token.symbol}
          </Amount>
        </NoWrapCell>
        <NoWrapCell>
          <ActionsWrapper>
            {network.etherscanBaseUrl && (
              <ContextMenu>
                <ContextMenuItem onClick={this.handleViewTransaction}>
                  <IconTokens />
                  <ActionLabel>View Transaction</ActionLabel>
                </ContextMenuItem>
              </ContextMenu>
            )}
          </ActionsWrapper>
        </NoWrapCell>
      </TableRow>
    )
  }
}

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

export default provideNetwork(TransferRow)
