import React, { useMemo, useCallback } from 'react'
import PropTypes from 'prop-types'
import BN from 'bn.js'
import { useConnectedAccount } from '@aragon/api-react'
import {
  ContextMenu,
  ContextMenuItem,
  DataView,
  GU,
  IconAdd,
  IconInfo,
  IconLabel,
  IconRemove,
  Split,
  formatTokenAmount,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { addressesEqual } from '../web3-utils'
import InfoBoxes from '../components/InfoBoxes'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'
import { useIdentity } from '../components/IdentityManager/IdentityManager'
import You from '../components/You'
import { useTotalVestedTokensInfo } from '../app-logic'

function Holders({
  groupMode,
  holders,
  maxAccountTokens,
  onAssignTokens,
  onRemoveTokens,
  tokenAddress,
  tokenDecimals,
  tokenDecimalsBase,
  tokenName,
  tokenSupply,
  tokenSymbol,
  tokenTransfersEnabled,
  selectHolder,
  vestings,
}) {
  const { layoutName } = useLayout()
  const compact = layoutName === 'small'
  const connectedAccount = useConnectedAccount()

  const mappedEntries = useMemo(
    () =>
      holders.map(({ address, balance }) => {
        if (vestings[address]) {
          return [address, balance, vestings[address]]
        }

        return [address, balance, []]
      }),
    [holders, vestings]
  )

  return (
    <Split
      primary={
        <DataView
          fields={groupMode ? ['Owner'] : ['Holder', 'Balance']}
          entries={mappedEntries}
          renderEntry={([address, balance, vestings]) => {
            const theme = useTheme()
            const { totalLocked } = useTotalVestedTokensInfo(vestings)

            const isCurrentUser = addressesEqual(address, connectedAccount)

            const values = [
              <div
                css={`
                  display: flex;
                  align-items: center;
                  /* On compact views, leave space for the rest of the data view */
                  max-width: ${compact
                    ? `calc(100vw - ${20 * GU}px)`
                    : 'unset'};
                `}
              >
                <LocalIdentityBadge
                  entity={address}
                  connectedAccount={isCurrentUser}
                />
                {isCurrentUser && <You css="flex-shrink: 0" />}
              </div>,
            ]

            if (!groupMode) {
              values.push(
                <div
                  css={`
                    display: flex;
                    align-items: center;
                  `}
                >
                  {formatTokenAmount(balance, tokenDecimals)}
                  {!totalLocked.isZero() && (
                    <div
                      css={`
                        padding-left: ${1 * GU}px;
                        ${textStyle('label1')};
                        color: ${theme.surfaceContentSecondary};
                      `}
                    >
                      ({formatTokenAmount(totalLocked, tokenDecimals)} locked)
                    </div>
                  )}
                </div>
              )
            }

            return values
          }}
          renderEntryActions={([address, balance, vestings]) => (
            <EntryActions
              address={address}
              onAssignTokens={onAssignTokens}
              onRemoveTokens={onRemoveTokens}
              onSelectHolder={selectHolder}
              singleToken={groupMode || balance.eq(tokenDecimalsBase)}
              canAssign={!groupMode && balance.lt(maxAccountTokens)}
              hasVestings={vestings.length > 0}
            />
          )}
        />
      }
      secondary={
        <InfoBoxes
          holders={holders}
          tokenAddress={tokenAddress}
          tokenDecimals={tokenDecimals}
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
  tokenDecimals: PropTypes.instanceOf(BN),
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
  onSelectHolder,
  singleToken,
  canAssign,
  hasVestings,
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

  const selectHolder = useCallback(() => onSelectHolder(address), [
    address,
    onSelectHolder,
  ])
  const actions = [
    ...(hasVestings ? [[selectHolder, IconInfo, 'Details']] : []),
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
