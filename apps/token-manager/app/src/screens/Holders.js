import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { useConnectedAccount } from '@aragon/api-react'
import {
  ContextMenu,
  ContextMenuItem,
  DataView,
  IconAdd,
  IconLabel,
  IconRemove,
  Split,
  GU,
  useTheme,
} from '@aragon/ui'
import { formatBalance } from '../utils'
import { addressesEqual } from '../web3-utils'
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
}) {
  const connectedAccount = useConnectedAccount()
  return (
    <Split
      primary={
        <DataView
          mode="table"
          fields={groupMode ? ['Owner'] : ['Holder', 'Balance']}
          entries={holders.map(({ address, balance }) => [address, balance])}
          renderEntry={([address, balance]) => {
            const isCurrentUser = addressesEqual(address, connectedAccount)

            const values = [
              <div
                css={`
                  display: flex;
                  align-items: center;
                `}
              >
                <LocalIdentityBadge
                  entity={address}
                  connectedAccount={isCurrentUser}
                />
                {isCurrentUser && <You />}
              </div>,
            ]

            if (!groupMode) {
              values.push(formatBalance(balance, tokenDecimalsBase))
            }

            return values
          }}
          renderEntryActions={([address, balance]) => (
            <EntryActions
              address={address}
              onAssignTokens={onAssignTokens}
              onRemoveTokens={onRemoveTokens}
              singleToken={groupMode || balance.eq(tokenDecimalsBase)}
              canAssign={!groupMode && balance.lt(maxAccountTokens)}
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
    ...(canAssign ? [[assignTokens, IconAdd, 'Add tokens']] : []),
    [removeTokens, IconRemove, `Remove token${singleToken ? '' : 's'}`],
    [editLabel, IconLabel, `${label ? 'Edit' : 'Add'} custom label`],
  ]

  return (
    <ContextMenu zIndex={1}>
      {actions.map(([onClick, Icon, label], index) => (
        <ContextMenuItem onClick={onClick} key={index}>
          <span
            css={`
              position: relative;
              display: flex;
              align-items: center;
              justify-content: center;
              color: ${theme.surfaceContentSecondary};
            `}
          >
            <Icon />
          </span>
          <span
            css={`
              margin-left: ${1 * GU}px;
            `}
          >
            {label}
          </span>
        </ContextMenuItem>
      ))}
    </ContextMenu>
  )
}

export default Holders
