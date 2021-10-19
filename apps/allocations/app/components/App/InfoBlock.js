import React from 'react'
import PropTypes from 'prop-types'
import { GU, Text, textStyle, useTheme } from '@aragon/ui'

const InfoBlock = ({ title, large, medium, small, context, style }) => {
  const theme = useTheme()
  return (
    <div style={style}>
      <div css={`
          ${textStyle('label2')};
          margin-bottom: ${GU}px;
          color: ${theme.surfaceContentSecondary};
        `}
      >
        {title}
      </div>
      <Text.Block>
        {large && (
          <Text size="xlarge">
            {large + ' '}
          </Text>
        )}
        {medium && (
          <Text>
            {medium + ' '}
          </Text>
        )}
        {small && (
          <Text size="small">{small}</Text>
        )}
      </Text.Block>
      {context && (
        <Text.Block size="small" color={`${theme.surfaceContentSecondary}`}>
          {context}
        </Text.Block>
      )}
    </div>
  )
}

InfoBlock.propTypes = {
  title: PropTypes.string.isRequired,
  large: PropTypes.string,
  medium: PropTypes.string,
  small: PropTypes.string,
  context: PropTypes.string,
  style: PropTypes.object,
}

export default InfoBlock
