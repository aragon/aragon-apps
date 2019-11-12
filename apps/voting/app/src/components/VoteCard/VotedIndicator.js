import React from 'react'
import { useTheme, IconCheck, GU, textStyle, springs } from '@aragon/ui'
import { Spring } from 'react-spring'

const VotedIndicator = React.memo(function VotedIndicator({ expand }) {
  const theme = useTheme()
  return (
    <Spring
      config={springs.swift}
      from={{ width: `${2.5 * GU}px`, opacity: 0 }}
      to={{ width: `${(expand ? 7.5 : 2.5) * GU}px`, opacity: Number(expand) }}
    >
      {({ width, opacity }) => (
        <div
          style={{ width }}
          css={`
            overflow: hidden;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            height: ${2.5 * GU}px;
            padding: 0 ${1.25 * GU}px;
            border-radius: ${1.25 * GU}px;
            background: ${theme.infoSurface.alpha(0.08)};
            color: ${theme.info};
          `}
        >
          <div
            css={`
              position: absolute;
              top: 0;
              left: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              width: ${2.5 * GU}px;
              height: ${2.5 * GU}px;
            `}
          >
            <IconCheck size="tiny" />
          </div>
          <div
            style={{ opacity }}
            css={`
              position: absolute;
              top: 0;
              left: ${2.5 * GU}px;
              display: flex;
              align-items: center;
              height: ${2.5 * GU}px;
              ${textStyle('label3')};
            `}
          >
            voted
          </div>
        </div>
      )}
    </Spring>
  )
})

export default VotedIndicator
