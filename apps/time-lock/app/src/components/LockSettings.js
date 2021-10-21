import React from 'react'
import styled from 'styled-components'
import { Text, TokenBadge, useTheme } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'

import { formatTokenAmount, formatTime, round } from '../lib/math-utils'

function LockSettings({
  duration,
  amount,
  spamPenaltyFactor,
  tokenAddress,
  tokenName,
  tokenSymbol,
  tokenDecimals,
}) {
  const theme = useTheme()
  const network = useNetwork()

  return (
    <ul>
      {[
        ['Duration', <Text>{formatTime(Math.round(duration / 1000))}</Text>],
        [
          'Amount',
          <Text>{`${formatTokenAmount(amount, false, tokenDecimals)} ${tokenSymbol}`}</Text>,
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
        ['Spam penalty', <Text>{`${round(spamPenaltyFactor * 100)} %`}</Text>],
      ].map(([label, content], index) => {
        return (
          <Row key={index}>
            <span
              css={`
                color: ${theme.surfaceContentSecondary};
              `}
            >
              {label}
            </span>
            {content}
          </Row>
        )
      })}
    </ul>
  )
}

const Row = styled.li`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  list-style: none;
`

export default LockSettings
