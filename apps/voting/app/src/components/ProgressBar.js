import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Motion, spring } from 'react-motion'
import { IconCross, IconCheck, theme } from '@aragon/ui'

const ProgressBar = ({ progress, type }) => (
  <Motion defaultStyle={{ progress: 0 }} style={{ progress: spring(progress) }}>
    {({ progress }) => (
      <Main>
        <IconWrapper>
          {type === 'positive' ? <IconCheck /> : <IconCross />}
        </IconWrapper>
        <Base>
          <Progress
            color={type === 'positive' ? theme.positive : theme.negative}
            style={{ width: `${progress * 100}%` }}
          />
        </Base>
      </Main>
    )}
  </Motion>
)

ProgressBar.defaultProps = {
  progress: 0,
}

ProgressBar.propTypes = {
  type: PropTypes.oneOf(['positive', 'negative']).isRequired,
  progress: PropTypes.number,
}

const Main = styled.div`
  display: flex;
  width: 100%;
  height: 12px;
  align-items: center;
`

const IconWrapper = styled.div`
  display: flex;
  justify-content: center;
  width: 20px;
`

const Base = styled.div`
  margin-left: 10px;
  width: 100%;
  height: 6px;
  background: #edf3f6;
  border-radius: 2px;
`
const Progress = styled.div`
  height: 6px;
  background: ${({ color }) => color};
  border-radius: 2px;
`

export default ProgressBar
