import React, { useCallback } from 'react'
import styled from 'styled-components'
import {
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

const HolderRow = React.memo(
  ({
    address,
    balance,
    groupMode,
    isCurrentUser,
    maxAccountTokens,
    network,
    tokenDecimalsBase,
    compact,
    onAssignTokens,
    onRemoveTokens,
  }) => {
    const handleAssignTokens = useCallback(() => {
      onAssignTokens(address)
    }, [address, onAssignTokens])

    const handleRemoveTokens = useCallback(() => {
      onRemoveTokens(address)
    }, [address, onRemoveTokens])

    const singleToken = balance.eq(tokenDecimalsBase)
    const canAssign = balance.lt(maxAccountTokens)

    const [label, showLocalIdentityModal] = useIdentity(address)
    const handleEditLabel = useCallback(() => showLocalIdentityModal(address))

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
        </TableCell>
      </TableRow>
    )
  }
)

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

export default props => {
  const network = useNetwork()
  return <HolderRow network={network} {...props} />
}
