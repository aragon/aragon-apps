import React from 'react'
import styled from 'styled-components'
import {
  Badge,
  ContextMenu,
  ContextMenuItem,
  IconAdd,
  IconRemove,
  IdentityBadge,
  TableCell,
  TableRow,
  Viewport,
  breakpoint,
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
        <StyledTableCell>
          <Owner>
            <Viewport>
              {({ width, above }) => (
                <IdentityBadge
                  entity={address}
                  shorten={(above('medium') && width < 1000) || width < 590}
                />
              )}
            </Viewport>
            {isCurrentUser && (
              <Badge.Identity
                style={{ fontVariant: 'small-caps' }}
                title="This is your Ethereum address"
              >
                you
              </Badge.Identity>
            )}
          </Owner>
        </StyledTableCell>
        {!groupMode && (
          <TableCell align="right">
            {formatBalance(balance, tokenDecimalsBase)}
          </TableCell>
        )}
        <StyledTableCell align="right">
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
        </StyledTableCell>
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

  ${breakpoint(
    'medium',
    `
      &&& {
        border-left-width: 1px;
        border-right-width: 1px;

        :first-child, :last-child {
          border-radius: 3px;
        }
      }
    `
  )};
`

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
