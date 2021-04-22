import React from 'react'
import styled from 'styled-components'
import { Text } from '@aragon/ui'
import { animated } from 'react-spring'

class SurveyOption extends React.Component {
  render() {
    const { label, value, percentage, showProgress } = this.props
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
  background: #21d48e;
  transform-origin: 0 0;
`

export default SurveyOption
