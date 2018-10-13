import React from 'react'
import styled from 'styled-components'
import {
  TableRow,
  TableCell,
  ContextMenu,
  ContextMenuItem,
  IconAdd,
  Badge,
} from '@aragon/ui'
import { formatBalance } from '../utils'

class HolderRow extends React.Component {
  static defaultProps = {
    name: '',
    balance: 0,
    groupMode: false,
    onAssignTokens: () => {},
  }
  handleAssignTokens = () => {
    const { name, onAssignTokens } = this.props
    onAssignTokens(name)
  }
  render() {
    const {
      name,
      balance,
      groupMode,
      tokenDecimalsBase,
      isCurrentUser,
    } = this.props
    return (
      <TableRow>
        <TableCell>
          <Owner>
            <span>{name}</span>
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
            <ContextMenuItem onClick={this.handleAssignTokens}>
              <IconAdd />
              <ActionLabel>Assign Tokens</ActionLabel>
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

export default HolderRow
