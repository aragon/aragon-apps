import React, { useMemo } from 'react'
import { useConnectedAccount, useNetwork } from '@aragon/api-react'
import { Box, Distribution, GU, TokenBadge, useTheme } from '@aragon/ui'
import { formatBalance, stakesPercentages } from '../utils'
import { addressesEqual } from '../web3-utils'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import You from './You'

const DISTRIBUTION_ITEMS_MAX = 7

function displayedStakes(accounts, total) {
  return stakesPercentages(
    accounts.map(({ balance }) => balance),
    {
      total,
      maxIncluded: DISTRIBUTION_ITEMS_MAX,
    }
  ).map((stake, index) => ({
    item: stake.index === -1 ? 'Rest' : accounts[index].address,
    percentage: stake.percentage,
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
  tokenTransfersEnabled,
}) {
  const theme = useTheme()
  const connectedAccount = useConnectedAccount()
  const network = useNetwork()

  const stakes = useMemo(() => displayedStakes(holders, tokenSupply), [
    holders,
    tokenSupply,
  ])

  return (
    <React.Fragment>
      <Box heading="Token Info">
        <ul>
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
                networkType={network && network.type}
              />,
            ],
          ].map(([label, content], index) => (
            <li
              key={index}
              css={`
                display: flex;
                justify-content: space-between;
                list-style: none;
                color: ${theme.surfaceContent};

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
        <Distribution
          heading="Tokenholder stakes"
          items={stakes}
          renderLegendItem={({ item: account }) => {
            const isCurrentUser = addressesEqual(account, connectedAccount)
            return (
              <div>
                <LocalIdentityBadge
                  entity={account}
                  connectedAccount={isCurrentUser}
                />
                {isCurrentUser && <You />}
              </div>
            )
          }}
        />
      </Box>
    </React.Fragment>
  )
}

InfoBoxes.defaultProps = {
  holders: [],
}

export default InfoBoxes
