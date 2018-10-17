import React from 'react'
import styled from 'styled-components'
import { Text, theme } from '@aragon/ui'
import { safeDiv, percentageList, tokenAmount } from '../math-utils'
import SummaryBar from './SummaryBar'
import SummaryRows from './SummaryRows'

const VoteSummary = ({
  votesYea,
  votesNay,
  quorum,
  quorumProgress,
  support,
  tokenSymbol,
  tokenDecimals,
  ready,
}) => {
  const totalVotes = votesYea + votesNay
  const votesYeaVotersSize = safeDiv(votesYea, totalVotes)
  const votesNayVotersSize = safeDiv(votesNay, totalVotes)

  const [yeaPct, nayPct] = percentageList(
    [votesYeaVotersSize, votesNayVotersSize],
    2
  )

  return (
    <Main>
      <Header>
        <span>
          <Text color={theme.textSecondary} smallcaps>
            Current votes{' '}
          </Text>
          <Text size="xsmall" color={theme.textSecondary}>
            ({Math.round(support * 100)}% needed)
          </Text>
        </span>
      </Header>

      <SummaryBar
        positiveSize={votesYeaVotersSize}
        negativeSize={votesNayVotersSize}
        requiredSize={support}
        show={ready}
      />

      <SummaryRows
        yea={{ pct: yeaPct, amount: tokenAmount(votesYea, tokenDecimals) }}
        nay={{ pct: nayPct, amount: tokenAmount(votesNay, tokenDecimals) }}
        symbol={tokenSymbol}
      />
    </Main>
  )
}

const Main = styled.div`
  padding: 20px 0;
`

const Header = styled.h2`
  display: flex;
  justify-content: space-between;
`

export default VoteSummary
