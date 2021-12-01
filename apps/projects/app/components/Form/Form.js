import PropTypes from 'prop-types'
import React from 'react'
import { Button, Text, theme } from '@aragon/ui'

const Form = ({ children, className, onSubmit, submitText, heading, subHeading, separator, submitDisabled }) => {
  return (
    // TODO: Fix the SidePanel 2 lines heading thing
    <form className={className} onSubmit={onSubmit}>
      {heading && <Text size="xxlarge">{heading}</Text>}
      {subHeading && <Text color={theme.textTertiary}>{subHeading}</Text>}
      {separator && <div style={{ height: '1rem' }} />}
      {children}
      <Button
        style={{ userSelect: 'none' }}
        mode="strong"
        wide
        disabled={submitDisabled}
        type="submit"
      >
        {submitText}
      </Button>
    </form>
  )
}

Form.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  onSubmit: PropTypes.func.isRequired,
  submitText: PropTypes.node.isRequired,
  heading: PropTypes.string,
  separator: PropTypes.bool,
  subHeading: PropTypes.string,
  submitDisabled: PropTypes.bool,
}

Form.defaultProps = {
  submitText: 'Submit',
  submitDisabled: false,
}

export default Form
