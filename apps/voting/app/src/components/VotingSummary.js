import React from 'react'
import styled from 'styled-components'
import { Motion, spring } from 'react-motion'
import { SidePanel, Text, theme, spring as springConf } from '@aragon/ui'
import VotingStatus from './VotingStatus'

const { PANEL_INNER_WIDTH } = SidePanel

const fast = springConf('fast')

const VotingBar = ({ votesYes, votesNo, quorum }) => (
  <Motion
    defaultStyle={{
      votesYesProgress: 0,
      votesNoProgress: 0,
      quorumProgress: 0,
    }}
    style={{
      votesYesProgress: spring(votesYes, fast),
      votesNoProgress: spring(votesNo, fast),
      quorumProgress: spring(quorum, fast),
    }}
  >
    {({ votesYesProgress, votesNoProgress, quorumProgress }) => (
      <Main>
        <Header>
          <h2>
            <Label>
              Quorum: <strong>{Math.round(quorumProgress * 100)}%</strong>
            </Label>
          </h2>
          <VotingStatus votesYes={votesYes} votesNo={votesNo} opened={true} />
        </Header>
        <BarWrapper>
          <QuorumBar
            style={{
              transform: `
                translateX(${PANEL_INNER_WIDTH * quorumProgress}px)
                scaleY(${quorum ? quorumProgress / quorum : 0})
              `,
            }}
          />
          <Bar>
            <Votes
              color={theme.positive}
              style={{
                transform: `scaleX(${votesYesProgress})`,
              }}
            />
            <Votes
              color={theme.negative}
              style={{
                transform: `scaleX(${votesNoProgress})`,
                left: `${PANEL_INNER_WIDTH * votesYesProgress}px`,
              }}
            />
          </Bar>
        </BarWrapper>

        <YesNoItem color={theme.positive}>
          <span>Yes</span>
          <strong>{Math.round(votesYesProgress * 100)}%</strong>
        </YesNoItem>
        <YesNoItem color={theme.negative}>
          <span>No</span>
          <strong>{Math.round(votesNoProgress * 100)}%</strong>
        </YesNoItem>
      </Main>
    )}
  </Motion>
)

const Main = styled.div`
  padding: 20px 0;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
`

const Label = styled(Text).attrs({
  smallcaps: true,
  color: theme.textSecondary,
})`
  display: block;
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
  span {
    width: 35px;
    color: ${theme.textSecondary};
  }
`

export default VotingBar
