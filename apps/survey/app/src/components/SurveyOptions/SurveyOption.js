import React from 'react'
import styled from 'styled-components'
import { Text } from '@aragon/ui'
import { animated } from 'react-spring'

class SurveyOption extends React.Component {
  render() {
    const { label, value, showProgress } = this.props
    return (
      <Main>
        <Labels>
          <Text size="xsmall">{label}</Text>
          <Text size="xsmall" color="#98A0A2">
            {Math.round(value * 1000) / 10}%
          </Text>
        </Labels>
        <BarWrapper>
          <Bar
            style={{
              width: `calc(100% * ${value})`,
              transform: showProgress.interpolate(t => `scaleX(${t})`),
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
