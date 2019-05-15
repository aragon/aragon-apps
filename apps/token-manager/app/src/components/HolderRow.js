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
import IconLabel from './IconLabel'
import { useNetwork } from '@aragon/api-react'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import { formatBalance } from '../utils'
import You from './You'
import { useIdentity } from './IdentityManager/IdentityManager'

const HolderRow = React.memo(({ address, balance, groupMode, isCurrentUser, maxAccountTokens, network, tokenDecimalsBase, compact, onAssignTokens, onRemoveTokens }) => {
    const handleAssignTokens = React.useCallback(() => {  
      onAssignTokens(address)
    }, [address, onAssignTokens])
  
    const handleRemoveTokens = React.useCallback(() => {
      onRemoveTokens(address)
    }, [address, onRemoveTokens])
    


    const singleToken = balance.eq(tokenDecimalsBase)
    const canAssign = balance.lt(maxAccountTokens)
    
    const [label, showLocalIdentityModal] = useIdentity(address)
    const handleEditLabel = () => showLocalIdentityModal(address)
  
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
              <ContextMenuItem onClick={handleAssignTokens}>
                <IconWrapper>
                  <IconAdd />
                </IconWrapper>
                <ActionLabel>Add tokens</ActionLabel>
              </ContextMenuItem>
            )}
            <ContextMenuItem onClick={handleRemoveTokens}>
              <IconWrapper>
                <IconRemove />
              </IconWrapper>
              <ActionLabel>
                Remove Token
                {singleToken ? '' : 's'}
              </ActionLabel>
            </ContextMenuItem>
            <ContextMenuItem onClick={handleEditLabel}>
              <IconWrapper>
                <IconLabel />
              </IconWrapper>
              <ActionLabel>
                {label ? 'Edit' : 'Add'} custom label
              </ActionLabel>
            </ContextMenuItem>
          </ContextMenu>
        </TableCell>
      </TableRow>
    )
  
})

HolderRow.defaultProps = {
  address: '',
  balance: 0,
  groupMode: false,
  onAssignTokens: () => {},
  onRemoveTokens: () => {},
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

export default props => {
  const network = useNetwork()
  return <HolderRow network={network} {...props} />
}
