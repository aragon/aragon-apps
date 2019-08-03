import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { useNetwork } from '@aragon/api-react'
import {
  ContextMenu,
  ContextMenuItem,
  DataView,
  IconAdd,
  IconLabel,
  IconRemove,
  Split,
  useTheme,
} from '@aragon/ui'
import { formatBalance } from '../utils'
import InfoBoxes from '../components/InfoBoxes'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import { useIdentity } from '../components/IdentityManager/IdentityManager'
import You from '../components/You'

function Holders({
  groupMode,
  holders,
  maxAccountTokens,
  onAssignTokens,
  onRemoveTokens,
  tokenAddress,
  tokenDecimalsBase,
  tokenName,
  tokenSupply,
  tokenSymbol,
  tokenTransfersEnabled,
  userAccount,
}) {
  const network = useNetwork()
  return (
    <Split
      primary={
        <DataView
          mode="table"
          fields={groupMode ? ['Owner'] : ['Holder', 'Balance']}
          entries={holders.map(({ address, balance }) =>
            groupMode ? [address] : [address, balance]
          )}
          renderEntry={([address, balance]) => {
            const isCurrentUser = Boolean(
              userAccount && userAccount === address
            )

            const values = [
              <React.Fragment>
                <LocalIdentityBadge
                  entity={address}
                  networkType={network.type}
                  connectedAccount={isCurrentUser}
                />
                {isCurrentUser && <You />}
              </React.Fragment>,
            ]

            if (balance) {
              values.push(formatBalance(balance, tokenDecimalsBase))
            }

            return values
          }}
          renderEntryActions={([address, balance]) => (
            <EntryActions
              address={address}
              balance={balance}
              onAssignTokens={onAssignTokens}
              onRemoveTokens={onRemoveTokens}
              singleToken={balance.eq(tokenDecimalsBase)}
              canAssign={balance.lt(maxAccountTokens)}
            />
          )}
        />
      }
      secondary={
        <InfoBoxes
          holders={holders}
          tokenAddress={tokenAddress}
          tokenDecimalsBase={tokenDecimalsBase}
          tokenName={tokenName}
          tokenSupply={tokenSupply}
          tokenSymbol={tokenSymbol}
          tokenTransfersEnabled={tokenTransfersEnabled}
          userAccount={userAccount}
        />
      }
    />
  )
}

Holders.propTypes = {
  groupMode: PropTypes.bool,
  holders: PropTypes.array,
  maxAccountTokens: PropTypes.instanceOf(BN),
  onAssignTokens: PropTypes.func.isRequired,
  onRemoveTokens: PropTypes.func.isRequired,
  tokenAddress: PropTypes.string,
  tokenDecimalsBase: PropTypes.instanceOf(BN),
  tokenName: PropTypes.string,
  tokenSupply: PropTypes.instanceOf(BN),
  tokenSymbol: PropTypes.string,
  tokenTransfersEnabled: PropTypes.bool,
  userAccount: PropTypes.string,
}

Holders.defaultProps = {
  holders: [],
}

function EntryActions({
  address,
  onAssignTokens,
  onRemoveTokens,
  singleToken,
  canAssign,
}) {
  const theme = useTheme()
  const [label, showLocalIdentityModal] = useIdentity(address)

  const editLabel = useCallback(() => showLocalIdentityModal(address), [
    address,
    showLocalIdentityModal,
  ])
  const assignTokens = useCallback(() => onAssignTokens(address), [
    address,
    onAssignTokens,
  ])
  const removeTokens = useCallback(() => onRemoveTokens(address), [
    address,
    onRemoveTokens,
  ])

  const actions = [
    ...[canAssign ? [assignTokens, IconAdd, 'Add tokens'] : []],
    [removeTokens, IconRemove, `Remove Token${singleToken ? '' : 's'}`],
    [editLabel, IconLabel, `${label ? 'Edit' : 'Add'} custom label`],
  ]

  return (
    <ContextMenu>
      {actions.map(([onClick, Icon, label], index) => (
        <ContextMenuItem onClick={onClick} key={index}>
          <span
            css={`
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              width: 22px;
              height: 22px;
              color: ${theme.textSecondary};
            `}
          >
            <Icon />
          </span>
          <span css="margin-left: 15px">{label}</span>
        </ContextMenuItem>
      ))}
    </ContextMenu>
  )
}

export default Holders
