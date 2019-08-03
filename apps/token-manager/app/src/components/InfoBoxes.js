import React, { useMemo } from 'react'
import { Box, GU, TokenBadge, textStyle, useTheme } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { formatBalance, stakesPercentages } from '../utils'
import You from './You'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'

const DISTRIBUTION_ITEMS_MAX = 7

function displayedStakes(accounts, total, colors) {
  return stakesPercentages(accounts.map(({ balance }) => balance), {
    total,
    maxIncluded: DISTRIBUTION_ITEMS_MAX,
  }).map((stake, index) => ({
    name: stake.index === -1 ? 'Rest' : accounts[index].address,
    stake: stake.percentage,
    color: colors[index % colors.length],
  }))
}

function transferableLabel(transfersEnabled) {
  if (transfersEnabled === undefined) {
    return 'Unknown'
  }
  return transfersEnabled ? 'Yes' : 'No'
}

function InfoBoxes({
  holders,
  tokenAddress,
  tokenDecimalsBase,
  tokenName,
  tokenSupply,
  tokenSymbol,
  userAccount,
  tokenTransfersEnabled,
}) {
  const network = useNetwork()
  const theme = useTheme()

  const colors = [
    theme.blue,
    theme.red,
    theme.brown,
    theme.yellow,
    theme.purple,
    theme.green,
  ]

  const stakes = useMemo(() => displayedStakes(holders, tokenSupply, colors), [
    holders,
    tokenSupply,
    colors,
  ])

  return (
    <React.Fragment>
      <Box heading="Token Info">
        <ul
          css={`
            color: ${theme.surfaceContent};
          `}
        >
          {[
            [
              'Total supply',
              <strong>{formatBalance(tokenSupply, tokenDecimalsBase)}</strong>,
            ],
            [
              'Transferable',
              <strong>{transferableLabel(tokenTransfersEnabled)}</strong>,
            ],
            [
              'Token',
              <TokenBadge
                address={tokenAddress}
                name={tokenName}
                symbol={tokenSymbol}
                networkType={network.type}
              />,
            ],
          ].map(([label, content], index) => (
            <li
              key={index}
              css={`
                display: flex;
                justify-content: space-between;
                list-style: none;
                & + & {
                  margin-top: ${2 * GU}px;
                }

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
      <Box heading="Ownership Distribution">
        <p css={textStyle('body2')}>Token Holder Stakes</p>
        <div
          css={`
            display: flex;
            width: 100%;
            overflow: hidden;
            margin: 10px 0 30px;
            border-radius: 3px;
          `}
        >
          {stakes.map(({ name, stake, color }) => (
            <div
              key={name}
              title={`${name}: ${stake}%`}
              style={{
                width: `${stake}%`,
                height: '6px',
                background: color,
              }}
            />
          ))}
        </div>
        <ul>
          {stakes.map(({ name, stake, color }) => (
            <li
              key={name}
              css={`
                display: flex;
                align-items: center;
                justify-content: space-between;
                margin-top: 10px;
                list-style: none;

                > span:first-child {
                  display: flex;
                  align-items: center;
                  max-width: 80%;
                }
              `}
            >
              <span>
                <span
                  css={`
                    width: ${1 * GU}px;
                    height: ${1 * GU}px;
                    margin-right: ${1 * GU}px;
                    border-radius: 50%;
                    flex-shrink: 0;
                    & + span {
                      flex-shrink: 1;
                      text-overflow: ellipsis;
                      overflow: hidden;
                    }
                  `}
                  style={{ background: color }}
                />
                <LocalIdentityBadge
                  entity={name}
                  networkType={network.type}
                  connectedAccount={name === userAccount}
                />
                {name === userAccount && <You />}
              </span>
              <strong>{stake}%</strong>
            </li>
          ))}
        </ul>
      </Box>
    </React.Fragment>
  )
}

InfoBoxes.defaultProps = {
  holders: [],
}

export default InfoBoxes
