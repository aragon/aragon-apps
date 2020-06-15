import React from 'react'
import styled from 'styled-components'
import { GU, useTheme } from '@aragon/ui'

function SummaryRow({ color, label, pct, content }) {
  const theme = useTheme()
  return (
    <div
      css={`
        display: flex;
        width: 100%;
        margin-bottom: ${1 * GU}px;
        align-items: center;
        justify-content: space-between;
        white-space: nowrap;
      `}
    >
      <div
        css={`
          display: flex;
          align-items: center;
        `}
      >
        <Bullet color={color} />
        <div
          css={`
            width: ${15 * GU}px;
            color: ${theme.surfaceContentSecondary};
          `}
        >
          {label}
        </div>
      </div>
      <div>{pct}%</div>
      <div
        css={`
          color: ${theme.surfaceContentSecondary};
          margin-left: ${2 * GU}px;
        `}
      >
        {content}
      </div>
    </div>
  )
}

const Bullet = styled.div`
  flex-shrink: 0;
  display: block;
  width: ${1 * GU}px;
  height: ${1 * GU}px;
  margin-right: ${2 * GU}px;
  border-radius: 50%;
  background: ${({ color }) => color};
`

export default SummaryRow
