import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Spring, animated } from 'react-spring'
import { IconCross, IconCheck, theme, springs } from '@aragon/ui'

const ProgressBar = ({ progress, type }) => (
  <Spring from={{ progress: 0 }} to={{ progress }} config={springs.lazy} native>
    {({ progress }) => (
      <Main>
        <IconWrapper>
          {type === 'positive' ? <IconCheck /> : <IconCross />}
        </IconWrapper>
        <Base>
          <ProgressWrapper>
            <Progress
              style={{
                backgroundColor:
                  type === 'positive' ? theme.positive : theme.negative,
                transform: progress.interpolate(t => `scale3d(${t}, 1, 1)`),
              }}
            />
          </ProgressWrapper>
        </Base>
      </Main>
    )}
  </Spring>
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

const ProgressWrapper = styled.div`
  overflow: hidden;
  border-radius: 2px;
`

const Progress = styled(animated.div)`
  height: 6px;
  transform-origin: 0 0;
`

export default ProgressBar
