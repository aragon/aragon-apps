import React from 'react'
import {
  CardLayout,
  Tag,
  GU,
  textStyle,
  unselectable,
  useLayout,
  useTheme,
} from '@aragon/ui'

const VoteCardGroup = ({ title, count, children }) => {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'
  const rowHeight = compactMode ? null : 294

  return (
    <section>
      <h2
        css={`
          display: flex;
          align-items: center;
          margin-bottom: ${3 * GU}px;
          ${compactMode ? `padding: 0 ${2 * GU}px;` : ''}
          ${unselectable};
        `}
      >
        <div
          css={`
            ${textStyle('body2')};
            color: ${theme.content};
          `}
        >
          {title}
        </div>
        <span
          css={`
            margin-left: ${1 * GU}px;
            display: flex;
            align-items: center;
            justify-content: center;
          `}
        >
          <Tag limitDigits={4} label={count} size="small" />
        </span>
      </h2>
      <CardLayout columnWidthMin={30 * GU} rowHeight={rowHeight}>
        {children}
      </CardLayout>
    </section>
  )
}

export default VoteCardGroup
