import React from 'react'
import styled from 'styled-components'
import { Text } from '@aragon/ui'
import posed from 'react-pose'

class SurveyCardOption extends React.Component {
  render() {
    const { label, value } = this.props
    return (
      <Main>
        <Labels>
          <Text size="xsmall">{label}</Text>
          <Text size="xsmall" color="#98A0A2">
            {value * 100}%
          </Text>
        </Labels>
        <BarWrapper>
          <Bar style={{ width: `calc(100% * ${value})` }} />
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

const Bar = posed(styled.div`
  height: 6px;
  background: #21d48e;
  transform-origin: 0 0;
`)({
  show: { scaleX: 1 },
  hide: { scaleX: 0 },
})

export default SurveyCardOption
