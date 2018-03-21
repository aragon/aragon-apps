import React from 'react'
import styled from 'styled-components'
import { Motion, spring } from 'react-motion'
import { SidePanel, Text, theme, spring as springConf } from '@aragon/ui'
import { safeDiv } from '../math-utils'

const { PANEL_INNER_WIDTH } = SidePanel

const fast = springConf('fast')

const VoteSummary = ({
  votesYea,
  votesNay,
  tokenSupply,
  quorum,
  quorumProgress,
  support,
  ready,
}) => {
  const totalVotes = votesYea + votesNay
  const votesYeaPct = safeDiv(votesYea, tokenSupply)
  const votesNayPct = safeDiv(votesNay, tokenSupply)

  const votesYeaVotersPct = safeDiv(votesYea, totalVotes)
  const votesNayVotersPct = safeDiv(votesNay, totalVotes)

  return (
    <Motion
      defaultStyle={{ progress: 0 }}
      style={{ progress: spring(Number(ready), fast) }}
    >
      {({ progress }) => (
        <Main>
          <Header>
            <span>
              <Label>
                Quorum: <strong>{Math.round(quorumProgress * 100)}%</strong>{' '}
              </Label>
              <Text size="xsmall" color={theme.textSecondary}>
                ({Math.round(quorum * 100)}% needed)
              </Text>
            </span>
          </Header>
          <BarWrapper>
            <QuorumBar
              style={{
                transform: `
                translateX(${PANEL_INNER_WIDTH * quorum * progress}px)
                scaleY(${quorum ? progress : 0})
              `,
              }}
            />
            <Bar>
              <Votes
                color={theme.positive}
                style={{
                  transform: `scaleX(${votesYeaPct * progress})`,
                }}
              />
              <Votes
                color={theme.negative}
                style={{
                  transform: `scaleX(${votesNayPct * progress})`,
                  left: `${PANEL_INNER_WIDTH * votesYeaPct * progress}px`,
                }}
              />
            </Bar>
          </BarWrapper>

          <YesNoItem color={theme.positive}>
            <span>Yes</span>
            <strong>{Math.round(votesYeaVotersPct * progress * 100)}%</strong>
            <Text size="xsmall" color={theme.textSecondary}>
              ({Math.round(support * 100)}% needed)
            </Text>
          </YesNoItem>
          <YesNoItem color={theme.negative}>
            <span>No</span>
            <strong>{Math.round(votesNayVotersPct * progress * 100)}%</strong>
          </YesNoItem>
        </Main>
      )}
    </Motion>
  )
}

const Main = styled.div`
  padding: 20px 0;
`

const Header = styled.h2`
  display: flex;
  justify-content: space-between;
`

const Label = styled(Text).attrs({
  smallcaps: true,
  color: theme.textSecondary,
})`
  strong {
    color: #000;
  }
`

const BarWrapper = styled.div`
  position: relative;
  display: flex;
  margin: 10px 0;
  align-items: center;
  height: 50px;
`

const Bar = styled.div`
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 6px;
  border-radius: 2px;
  background: #6d777b;
`

const Votes = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  transform-origin: 0 0;
  background: ${({ color }) => color};
`

const QuorumBar = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 0;
  border-right: 1px dashed #979797;
`

const YesNoItem = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  &:first-child {
    margin-bottom: 10px;
  }
  &:before {
    content: '';
    display: block;
    width: 10px;
    height: 10px;
    margin-right: 15px;
    border-radius: 5px;
    background: ${({ color }) => color};
  }
  span:first-child {
    width: 35px;
    color: ${theme.textSecondary};
  }
  span:last-child {
    margin-left: 10px;
  }
`

export default VoteSummary
