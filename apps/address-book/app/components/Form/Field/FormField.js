import React from 'react'
import PropTypes from 'prop-types'
import { SidePanelSeparator, Text, textStyle, useTheme } from '@aragon/ui'

const FormField = ({ input, label, hint, required, separator, err }) => {
  // TODO: Currently it will only work with 1 required child
  // const isRequired = React.Children.toArray(children).some(
  //   ({ props: childProps }) => childProps.required
  // )
  const theme = useTheme()

  return (
    <div css="margin-bottom: 1rem">
      <div>
        {label && (
          <Text css={`
            ${textStyle('label2')};
            color: ${theme.surfaceContentSecondary};
          `}>
            {label}
          </Text>
        )}
        {required && (
          <Text
            size="xsmall"
            css={`
              color: ${theme.accent};
              margin-left: 0.3rem;
            `}
            title="Required"
          >
            *
          </Text>
        )}
      </div>
      {hint && (
        <Text size="xsmall" color={theme.surfaceContentSecondary}>
          {hint}
        </Text>
      )}
      {err && (
        <div>
          <Text size="xsmall" color={theme.negative}>
            {err}
          </Text>
        </div>
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
  err: PropTypes.string,
}

export default FormField
