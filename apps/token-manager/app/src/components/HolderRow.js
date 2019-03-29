import React from 'react'
import styled from 'styled-components'
import {
  ContextMenu,
  ContextMenuItem,
  IconAdd,
  IconRemove,
  TableCell,
  TableRow,
  theme,
} from '@aragon/ui'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import provideNetwork from '../provide-network'
import { formatBalance } from '../utils'
import You from './You'

class HolderRow extends React.Component {
  static defaultProps = {
    address: '',
    balance: 0,
    groupMode: false,
    onAssignTokens: () => {},
    onRemoveTokens: () => {},
  }
  handleAssignTokens = () => {
    const { address, onAssignTokens } = this.props
    onAssignTokens(address)
  }
  handleRemoveTokens = () => {
    const { address, onRemoveTokens } = this.props
    onRemoveTokens(address)
  }
  render() {
    const {
      address,
      balance,
      groupMode,
      isCurrentUser,
      maxAccountTokens,
      network,
      tokenDecimalsBase,
      compact,
    } = this.props

    const singleToken = balance.eq(tokenDecimalsBase)
    const canAssign = balance.lt(maxAccountTokens)

    return (
      <TableRow>
        <FirstTableCell css="padding-right: 0">
          <Owner>
            <LocalIdentityBadge
              entity={address}
              networkType={network.type}
              connectedAccount={isCurrentUser}
            />
            {isCurrentUser && <You />}
          </Owner>
        </FirstTableCell>
        {!groupMode && (
          <TableCell align={compact ? 'left' : 'right'}>
            {formatBalance(balance, tokenDecimalsBase)}
          </TableCell>
        )}
        <TableCell align="right" css="padding-left: 0">
          <ContextMenu>
            {canAssign && (
              <ContextMenuItem onClick={this.handleAssignTokens}>
                <IconWrapper>
                  <IconAdd />
                </IconWrapper>
                <ActionLabel>Assign Tokens</ActionLabel>
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={this.handleRemoveTokens}>
              <IconWrapper>
                <IconRemove />
              </IconWrapper>
              <ActionLabel>
                Remove Token
                {singleToken ? '' : 's'}
              </ActionLabel>
            </ContextMenuItem>
          </ContextMenu>
        </TableCell>
      </TableRow>
    )
  }
}

const FirstTableCell = styled(TableCell)`
  max-width: 0;
  width: 100%;
  overflow: hidden;
`

const ActionLabel = styled.span`
  margin-left: 15px;
`

const Owner = styled.div`
  display: flex;
  align-items: center;
  overflow: hidden;
  & > span:first-child {
    margin-right: 10px;
  }
`

const IconWrapper = styled.span`
  display: flex;
  align-content: center;
  margin-top: -3px;
  color: ${theme.textSecondary};
`

export default provideNetwork(HolderRow)
