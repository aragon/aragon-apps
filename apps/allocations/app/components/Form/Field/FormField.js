import React from 'react'
import PropTypes from 'prop-types'
import { SidePanelSeparator, Text, theme } from '@aragon/ui'

import { FieldTitle } from '.'

const FormField = ({
  input,
  label,
  hint,
  required,
  separator,
  visible = true,
}) => {
  if (!visible) return null
  // TODO: Currently it will only work with 1 required child
  // const isRequired = React.Children.toArray(children).some(
  //   ({ props: childProps }) => childProps.required
  // )

  return (
    <div style={{ marginBottom: '1rem' }}>
      <FieldTitle>
        {label && <Text color={theme.textTertiary}>{label}</Text>}
        {required && (
          <Text
            size="xsmall"
            color={theme.accent}
            title="Required"
            style={{ marginLeft: '0.3rem' }}
          >
            *
          </Text>
        )}
      </FieldTitle>
      {hint && (
        <Text size="xsmall" color={theme.textTertiary}>
          {hint}
        </Text>
      )}
      {input}
      {separator && <SidePanelSeparator style={{ marginTop: '1rem' }} />}
    </div>
  )
}

FormField.propTypes = {
  input: PropTypes.node,
  label: PropTypes.string,
  required: PropTypes.bool,
  hint: PropTypes.string,
  separator: PropTypes.bool,
  visible: PropTypes.bool,
}

export default FormField
