import React from 'react'
import styled from 'styled-components'
import { GU, RADIUS, textStyle, useTheme } from '@aragon/ui'
import { animated } from 'react-spring'

function VoteOption({ color, label, percentage, value }) {
  const theme = useTheme()
  return (
    <Main>
      <Labels>
        <span
          css={`
            ${textStyle('label2')}
          `}
        >
          {label}
        </span>
        <span
          css={`
            ${textStyle('body3')}
            font-size: 12px;
            color: ${theme.surfaceContentSecondary};
          `}
        >
          {percentage}%
        </span>
      </Labels>
      <div
        css={`
          overflow: hidden;
          background: ${theme.surfaceUnder};
          border-radius: ${RADIUS}px;
        `}
      >
        <Bar
          css={`
            background-color: ${color || theme.positive};
            width: 100%;
          `}
          style={{
            transform: value.interpolate(v => `scale3d(${v}, 1, 1)`),
          }}
        />
      </div>
    </Main>
  )
}

const Main = styled.div`
  & + & {
    margin-top: ${1 * GU}px;
  }
`

const Labels = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: ${0.5 * GU}px;
`

const Bar = styled(animated.div)`
  height: 6px;
  transform-origin: 0 0;
`

export default React.memo(VoteOption)
