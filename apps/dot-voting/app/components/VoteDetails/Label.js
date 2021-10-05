import React from 'react'
import PropTypes from 'prop-types'
import { GU, textStyle, useTheme } from '@aragon/ui'

const Label = ({ children }) => {
  const theme = useTheme()
  return (
    <div css={`
        ${textStyle('label2')};
        margin-bottom: ${2 * GU}px !important;
        color: ${theme.surfaceContentSecondary};
      `}
    >
      {children}
    </div>
  )
}

Label.propTypes = {
  children: PropTypes.node.isRequired,
}

export default Label
