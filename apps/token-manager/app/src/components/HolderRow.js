import React from 'react'
import styled from 'styled-components'
import {
  TableRow,
  TableCell,
  ContextMenu,
  ContextMenuItem,
  IconAdd,
} from '@aragon/ui'

class HolderRow extends React.Component {
  static defaultProps = {
    name: '',
    balance: 0,
    groupMode: false,
  }
  static ActionLabel = styled.span`
    margin-left: 15px;
  `
  render() {
    const { name, balance, groupMode } = this.props
    const Self = this.constructor
    return (
      <TableRow>
        <TableCell>{name}</TableCell>
        {!groupMode && <TableCell align="right">{balance}</TableCell>}
        <TableCell align="right">
          <ContextMenu>
            <ContextMenuItem>
              <IconAdd />
              <Self.ActionLabel>Issue Tokens</Self.ActionLabel>
            </ContextMenuItem>
          </ContextMenu>
        </TableCell>
      </TableRow>
    )
  }
}

export default HolderRow
