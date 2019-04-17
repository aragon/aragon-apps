import React from 'react'
import styled from 'styled-components'
import { Text, theme } from '@aragon/ui'
import { percentageList, safeDiv } from '../math-utils'
import SummaryBar from './SummaryBar'
import SummaryRows from './SummaryRows'

const VoteSummary = ({ vote, tokenSymbol, tokenDecimals, ready }) => {
  const { yea, nay, supportRequired } = vote.numData
  const totalVotes = yea + nay
  const votesYeaVotersSize = safeDiv(yea, totalVotes)
  const votesNayVotersSize = safeDiv(nay, totalVotes)

  const [yeaPct, nayPct] = percentageList(
    [votesYeaVotersSize, votesNayVotersSize],
    2
  )

  return (
    <Main>
      <Header>
        <span>
          <Text color={theme.textSecondary} smallcaps>
            Votes{' '}
          </Text>
          <Text size="xsmall" color={theme.textSecondary}>
            ({Math.round(supportRequired * 100)}% support needed for approval)
          </Text>
        </span>
      </Header>

      <SummaryBar
        positiveSize={votesYeaVotersSize}
        negativeSize={votesNayVotersSize}
        requiredSize={supportRequired}
        show={ready}
      />

      <SummaryRows
        yea={{ pct: yeaPct, amount: yea }}
        nay={{ pct: nayPct, amount: nay }}
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
