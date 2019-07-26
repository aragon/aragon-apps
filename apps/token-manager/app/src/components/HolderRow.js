import React from 'react'
import styled from 'styled-components'
import { TableCell, TableRow } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import { formatBalance } from '../utils'
import You from './You'

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
  }) => (
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
      <TableCell align="right" css="padding-left: 0" />
    </TableRow>
  )
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
