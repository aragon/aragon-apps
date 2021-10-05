import PropTypes from 'prop-types'
import React from 'react'

import {
  CardLayout,
  GU,
  Tag,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'

const VoteCardGroup = ({ title, count, children }) => {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'

  return (
    <section>
      <h2
        css={`
          display: flex;
          align-items: center;
          margin-bottom: ${3 * GU}px;
          ${compactMode ? `padding: 0 ${2 * GU}px;` : ''}
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
      <CardLayout columnWidthMin={30 * GU} css="grid-auto-rows: auto">
        {children}
      </CardLayout>
    </section>
  )
}

VoteCardGroup.propTypes = {
  children: PropTypes.node,
  count: PropTypes.number,
  title: PropTypes.string
}

export default VoteCardGroup
