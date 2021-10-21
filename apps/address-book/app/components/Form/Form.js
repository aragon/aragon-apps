import PropTypes from 'prop-types'
import React from 'react'
import { Button, Text, useTheme } from '@aragon/ui'

const Form = ({
  children,
  onSubmit,
  submitText,
  heading,
  subHeading,
  disabled,
  error
}) => {
  const theme = useTheme()

  return (
    // TODO: Fix the SidePanel 2 lines heading thing
    <React.Fragment>
      {heading && <Text size="xxlarge">{heading}</Text>}
      {subHeading && (
        <Text color={theme.surfaceContentSecondary}>{subHeading}</Text>
      )}
      <div css="height: 1rem" />
      {children}
      <Button
        css="user-select: none"
        mode="strong"
        wide
        onClick={onSubmit}
        disabled={disabled}
      >
        {submitText}
      </Button>
      {error}
    </React.Fragment>
  )
}

Form.propTypes = {
  children: PropTypes.node.isRequired,
  onSubmit: PropTypes.func.isRequired,
  submitText: PropTypes.string.isRequired,
  heading: PropTypes.string,
  subHeading: PropTypes.string,
  disabled: PropTypes.bool,
  error: PropTypes.node
}

Form.defaultProps = {
  submitText: 'Submit',
}

export default Form
