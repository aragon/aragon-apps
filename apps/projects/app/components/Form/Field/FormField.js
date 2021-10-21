import React from 'react'
import PropTypes from 'prop-types'
import { GU, Text, useTheme, SidePanelSeparator } from '@aragon/ui'

import { FieldTitle } from '.'

const FormField = ({ input, label, required, separator }) => {
  const theme = useTheme()
  // TODO: Currently it will only work with 1 required child
  // const isRequired = React.Children.toArray(children).some(
  //   ({ props: childProps }) => childProps.required
  // )

  return (
    <div css={`margin-bottom: ${2 * GU}px`}>
      <FieldTitle>
        {label && <Text color={`${theme.surfaceContentSecondary}`}>{label}</Text>}
        {required && (
          <Text
            size="xsmall"
            color={`${theme.accent}`}
            title="Required"
            css={`margin-left: ${GU}px}`}
          >
            *
          </Text>
        )}
      </FieldTitle>
      {input}
      {separator && <SidePanelSeparator css="margin-top: 1rem" />}
    </div>
  )
}

FormField.propTypes = {
  children: PropTypes.node,
  label: PropTypes.string,
  required: PropTypes.bool,
  input: PropTypes.element,
  separator: PropTypes.bool,
}

export default FormField
