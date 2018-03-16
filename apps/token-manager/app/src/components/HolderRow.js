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
    onAssignTokens: () => {},
  }
  handleAssignTokens = () => {
    const { name, onAssignTokens } = this.props
    onAssignTokens(name)
  }
  render() {
    const { name, balance, groupMode } = this.props
    return (
      <TableRow>
        <TableCell>{name}</TableCell>
        {!groupMode && <TableCell align="right">{balance}</TableCell>}
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

export default HolderRow
