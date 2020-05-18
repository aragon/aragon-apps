import React, { useMemo } from 'react'
import { useConnectedAccount } from '@aragon/api-react'
import { Box, formatTokenAmount, GU, textStyle, useTheme } from '@aragon/ui'
import { addressesEqual } from '../web3-utils'
import { useTotalVestedTokensInfo } from '../app-logic'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import TokenIcon from './Icons/TokenIcon'
import VestingIcon from './Icons/VestingIcon'
import TransferIcon from './Icons/TransferIcon'

function VestingInfoBoxes({ selectedHolder, tokenSymbol }) {
  const theme = useTheme()
  const connectedAccount = useConnectedAccount()
  const isCurrentUser = addressesEqual(
    selectedHolder.receiver,
    connectedAccount
  )
  const totalInfo = useTotalVestedTokensInfo(selectedHolder.vestings)
  return (
    <React.Fragment>
      <Box padding={0}>
        <div
          css={`
            padding: ${4 * GU}px;
            border-bottom: 1px solid ${theme.border};
          `}
        >
          <LocalIdentityBadge
            entity={selectedHolder.receiver}
            connectedAccount={isCurrentUser}
          />
        </div>
        <div
          css={`
            padding: ${3 * GU}px;
          `}
        >
          <InfoBoxHeader
            icon={<TokenIcon />}
            label={'Total Tokens'}
            content={formatTokenAmount(
              selectedHolder.holderBalance.balance,
              18,
              {
                symbol: tokenSymbol,
              }
            )}
          />
        </div>
      </Box>
      <Box>
        <InfoBoxHeader
          icon={<VestingIcon />}
          label={'Vested Tokens'}
          content={formatTokenAmount(totalInfo.totalAmount, 18, {
            symbol: tokenSymbol,
          })}
        />
        <ul
          css={`
            margin-top: ${4 * GU}px;
          `}
        >
          {[
            [
              'Unlocked',
              <strong>
                {formatTokenAmount(totalInfo.totalUnlocked, 18, {
                  symbol: tokenSymbol,
                })}
              </strong>,
            ],
            [
              'Locked',
              <strong>
                {formatTokenAmount(totalInfo.totalLocked, 18, {
                  symbol: tokenSymbol,
                })}
              </strong>,
            ],
          ].map(([label, content], index) => (
            <li
              key={index}
              css={`
                display: flex;
                justify-content: space-between;
                list-style: none;
                color: ${theme.surfaceContent};

                > span:nth-child(1) {
                  color: ${theme.surfaceContentSecondary};
                }
                > span:nth-child(2) {
                  // “:” is here for accessibility reasons, we can hide it
                  opacity: 0;
                  width: 10px;
                }
                > span:nth-child(3) {
                  flex-shrink: 1;
                }
                > strong {
                  text-transform: uppercase;
                }
              `}
            >
              <span>{label}</span>
              <span>:</span>
              {content}
            </li>
          ))}
        </ul>
      </Box>
      {isCurrentUser && (
        <Box>
          <InfoBoxHeader
            icon={<TransferIcon />}
            label={'Available to transfer'}
            content={formatTokenAmount(totalInfo.totalUnlocked, 18, {
              symbol: tokenSymbol,
            })}
          />
        </Box>
      )}
    </React.Fragment>
  )
}
function InfoBoxHeader({ icon, label, content }) {
  const theme = useTheme()
  return (
    <div
      css={`
        display: flex;
        justify-content: flex-start;
      `}
    >
      {icon}
      <div
        css={`
          display: inline-grid;
        `}
      >
        <label
          css={`
            ${textStyle('body3')};
            color: ${theme.surfaceContentSecondary};
          `}
        >
          {label}
        </label>
        {content}
      </div>
    </div>
  )
}

VestingInfoBoxes.defaultProps = {
  holders: [],
}

export default VestingInfoBoxes
