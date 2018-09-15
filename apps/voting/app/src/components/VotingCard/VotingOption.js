import React from 'react'
import styled from 'styled-components'
import { Text, theme } from '@aragon/ui'
import { animated } from 'react-spring'

class VotingOption extends React.Component {
  static defaultProps = {
    color: theme.positive,
  }
  render() {
    const { label, value, percentage, showProgress, color } = this.props
    return (
      <Main>
        <Labels>
          <Text size="xsmall">{label}</Text>
          <Text size="xsmall" color="#98A0A2">
            {percentage}%
          </Text>
        </Labels>
        <BarWrapper>
          <Bar
            style={{
              width: `${value * 100}%`,
              transform: showProgress.interpolate(t => `scale3d(${t}, 1, 1)`),
              backgroundColor: color,
            }}
          />
        </BarWrapper>
      </Main>
    )
  }
}

const Main = styled.div`
  & + & {
    margin-top: 10px;
  }
`

const Labels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 5px;
`

const BarWrapper = styled.div`
  overflow: hidden;
  background: #edf3f6;
  border-radius: 2px;
`

const Bar = styled(animated.div)`
  height: 6px;
  transform-origin: 0 0;
`

export default VotingOption
