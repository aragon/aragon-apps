import React from 'react'
import styled from 'styled-components'
import { Spring, animated } from 'react-spring'
import { SidePanel, Text, theme, springs } from '@aragon/ui'
import { safeDiv } from '../math-utils'

const { PANEL_INNER_WIDTH } = SidePanel

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
    <Spring
      from={{ progress: 0 }}
      to={{ progress: Number(ready) }}
      config={springs.lazy}
      native
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
                transform: progress.interpolate(
                  t => `
                    translate3d(${PANEL_INNER_WIDTH * quorum * t}px, 0, 0)
                    scale3d(1, ${quorum ? t : 0}, 1)
                  `
                ),
              }}
            />
            <Bar>
              <Votes
                style={{
                  backgroundColor: theme.positive,
                  transform: progress.interpolate(
                    t => `scale3d(${votesYeaPct * t}, 1, 1)`
                  ),
                }}
              />
              <Votes
                style={{
                  backgroundColor: theme.negative,
                  transform: progress.interpolate(
                    t => `
                      translate3d(
                        ${PANEL_INNER_WIDTH * votesYeaPct * t}px, 0, 0
                      )
                      scale3d(${votesNayPct * t}, 1, 1)
                    `
                  ),
                }}
              />
            </Bar>
          </BarWrapper>

          <YesNoItem color={theme.positive}>
            <span>Yes</span>
            <animated.strong>
              {progress.interpolate(
                t => `${Math.round(votesYeaVotersPct * t * 100)}%`
              )}
            </animated.strong>
            <Text size="xsmall" color={theme.textSecondary}>
              ({Math.round(support * 100)}% needed)
            </Text>
          </YesNoItem>
          <YesNoItem color={theme.negative}>
            <span>No</span>
            <animated.strong>
              {progress.interpolate(
                t => `${Math.round(votesNayVotersPct * t * 100)}%`
              )}
            </animated.strong>
          </YesNoItem>
        </Main>
      )}
    </Spring>
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

const Votes = styled(animated.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  transform-origin: 0 0;
`

const QuorumBar = styled(animated.div)`
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
  strong {
    width: 45px;
  }
`

export default VoteSummary
