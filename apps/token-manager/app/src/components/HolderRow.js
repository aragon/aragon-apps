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
  theme,
} from '@aragon/ui'
import provideNetwork from '../provide-network'
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
      network,
      tokenDecimalsBase,
      compact,
    } = this.props

    const singleToken = balance.eq(tokenDecimalsBase)
    const canAssign = balance.lt(maxAccountTokens)

    return (
      <TableRow>
        <TableCell css="padding-right: 0">
          <Owner>
            <IdentityBadge entity={address} networkType={network.type} />
            {isCurrentUser && <You />}
          </Owner>
        </TableCell>
        {!groupMode && (
          <TableCell
            align="right"
            css={`
              padding-left: ${compact ? '0' : '20px'};
            `}
          >
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

const You = styled(Badge.Identity).attrs({
  title: 'This is your Ethereum address',
  children: 'you',
})`
  font-variant: small-caps;
  margin-left: 10px;
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

export default provideNetwork(HolderRow)
