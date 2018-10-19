import React from 'react'
import styled from 'styled-components'
import {
  TableRow,
  TableCell,
  ContextMenu,
  ContextMenuItem,
  IconAdd,
  IconRemove,
  Badge,
  theme,
} from '@aragon/ui'
import { formatBalance } from '../utils'

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
      tokenDecimalsBase,
    } = this.props

    const singleToken = balance.eq(tokenDecimalsBase)
    const canAssign = balance.lt(maxAccountTokens)

    return (
      <TableRow>
        <TableCell>
          <Owner>
            <span>{address}</span>
            {isCurrentUser && (
              <Badge.Identity
                style={{ fontVariant: 'small-caps' }}
                title="This is your Ethereum address"
              >
                you
              </Badge.Identity>
            )}
          </Owner>
        </TableCell>
        {!groupMode && (
          <TableCell align="right">
            {formatBalance(balance, tokenDecimalsBase)}
          </TableCell>
        )}
        <TableCell align="right">
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

const ActionLabel = styled.span`
  margin-left: 15px;
`

const Owner = styled.div`
  display: flex;
  align-items: center;
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

export default HolderRow
