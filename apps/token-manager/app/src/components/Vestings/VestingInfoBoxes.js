import React from 'react'
import { useConnectedAccount } from '@aragon/api-react'
import {
  Box,
  EthIdenticon,
  formatTokenAmount,
  GU,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { addressesEqual } from '../../web3-utils'
import { shortenAddress } from '../../utils'
import { useAppLogic, useTotalVestedTokensInfo } from '../../app-logic'
import { useIdentity } from '../IdentityManager/IdentityManager'
import TokenIcon from '../Icons/TokenIcon'
import VestingIcon from '../Icons/VestingIcon'
import TransferIcon from '../Icons/TransferIcon'

function VestingInfoBoxes({ tokenDecimals, tokenSymbol }) {
  const theme = useTheme()
  const connectedAccount = useConnectedAccount()

  const { selectedHolder } = useAppLogic()
  const [label] = useIdentity(selectedHolder.address)
  const totalInfo = useTotalVestedTokensInfo(selectedHolder.vestings)

  const isCurrentUser = addressesEqual(selectedHolder.address, connectedAccount)

  return (
    <React.Fragment>
      <Box padding={0}>
        <div
          css={`
            padding: ${2 * GU}px ${6 * GU}px;
            border-bottom: 1px solid ${theme.border};
            display: flex;
            align-items: center;
          `}
        >
          <EthIdenticon
            address={selectedHolder.address}
            radius={100}
            scale={1.5}
            css={`
              margin-right: ${1.5 * GU}px;
            `}
          />
          <span
            css={`
              ${textStyle('body2')};
            `}
          >
            {label || shortenAddress(selectedHolder.address)}
          </span>
        </div>

        <div
          css={`
            padding: ${3 * GU}px;
          `}
        >
          <InfoBoxHeader
            icon={
              <TokenIcon
                css={`
                  max-height: ${6 * GU}px;
                  margin-left: ${3 * GU}px;
                  margin-right: ${2 * GU}px;
                `}
              />
            }
            label={'Total Tokens'}
            content={formatTokenAmount(selectedHolder.balance, tokenDecimals, {
              symbol: tokenSymbol,
            })}
          />
        </div>
      </Box>
      <Box>
        <InfoBoxHeader
          icon={
            <VestingIcon
              css={`
                max-height: ${6 * GU}px;
                margin-left: ${3 * GU}px;
                margin-right: ${2 * GU}px;
              `}
            />
          }
          label={'Vested Tokens'}
          content={formatTokenAmount(totalInfo.totalAmount, tokenDecimals, {
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
                {formatTokenAmount(totalInfo.totalUnlocked, tokenDecimals, {
                  symbol: tokenSymbol,
                })}
              </strong>,
            ],
            [
              'Locked',
              <strong>
                {formatTokenAmount(totalInfo.totalLocked, tokenDecimals, {
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
            icon={
              <TransferIcon
                css={`
                  max-height: ${6 * GU}px;
                  margin-left: ${3 * GU}px;
                  margin-right: ${2 * GU}px;
                `}
              />
            }
            label={'Available to transfer'}
            content={formatTokenAmount(totalInfo.totalUnlocked, tokenDecimals, {
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
      <div>
        <label
          css={`
            ${textStyle('body3')};
            color: ${theme.surfaceContentSecondary};
          `}
        >
          {label}
        </label>
        <div>{content}</div>
      </div>
    </div>
  )
}

VestingInfoBoxes.defaultProps = {
  holders: [],
}

export default VestingInfoBoxes
