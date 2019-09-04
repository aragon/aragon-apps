import React from 'react'
import styled from 'styled-components'
import { RADIUS, springs, useTheme } from '@aragon/ui'
import { Spring, animated } from 'react-spring'

function SummaryBar({ positiveSize, negativeSize, requiredSize, ...props }) {
  const theme = useTheme()
  return (
    <Spring
      from={{ progress: 0 }}
      to={{ progress: 1 }}
      config={springs.lazy}
      native
    >
      {({ progress }) => (
        <Main {...props}>
          <CombinedBar>
            {!!positiveSize && (
              <BarPart
                style={{
                  backgroundColor: theme.positive,
                  transform: progress.interpolate(
                    v => `scale3d(${positiveSize * v}, 1, 1)`
                  ),
                }}
              />
            )}
            {!!negativeSize && (
              <BarPart
                style={{
                  backgroundColor: theme.negative,
                  transform: progress.interpolate(
                    v => `
                      translate3d(${100 * positiveSize * v}%, 0, 0)
                      scale3d(${negativeSize * v}, 1, 1)
                    `
                  ),
                }}
              />
            )}
          </CombinedBar>
          <RequiredSeparatorClip>
            <RequiredSeparatorWrapper
              style={{
                transform: progress.interpolate(
                  v => `
                    translate3d(${100 * requiredSize * v}%, 0, 0)
                    scale3d(1, ${requiredSize > 0 ? v : 0}, 1)
                  `
                ),
              }}
            >
              <div
                css={`
                  height: 100%;
                  border-left: 1px dashed ${theme.surfaceContent};
                `}
              />
            </RequiredSeparatorWrapper>
          </RequiredSeparatorClip>
        </Main>
      )}
    </Spring>
  )
}

SummaryBar.defaultProps = {
  positiveSize: 0,
  negativeSize: 0,
  requiredSize: 0,
}

const Main = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  height: 25px;
`

const CombinedBar = props => {
  const theme = useTheme()
  return (
    <div
      css={`
        position: relative;
        overflow: hidden;
        width: 100%;
        height: 6px;
        border-radius: ${RADIUS}px;
        background: ${theme.surfaceUnder};
      `}
      {...props}
    />
  )
}

const BarPart = styled(animated.div)`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  height: 6px;
  transform-origin: 0 0;
`

const RequiredSeparatorClip = styled.div`
  overflow: hidden;
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
`

const RequiredSeparatorWrapper = styled(animated.div)`
  height: 100%;
`

export default SummaryBar
