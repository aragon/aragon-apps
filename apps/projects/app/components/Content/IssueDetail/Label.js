import React from 'react'
import PropTypes from 'prop-types'
import { textStyle, unselectable, useTheme } from '@aragon/ui'

const Label = ({ text, children }) => {
  const theme = useTheme()
  return (
    <label
      css={`
        ${textStyle('label2')};
        ${unselectable()};
        color: ${theme.surfaceContentSecondary};
      `}
    >
      {text}
      {children && children}
    </label>
  )
}

Label.propTypes = {
  text: PropTypes.string.isRequired,
  children: PropTypes.node,
}

export default Label
