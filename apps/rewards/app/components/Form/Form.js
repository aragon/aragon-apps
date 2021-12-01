import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'
import { Button } from '@aragon/ui'

const Form = ({
  children,
  onSubmit,
  submitText,
  disabled,
  errors,
}) => {
  return (
    <div>
      {children}
      <Button
        style={{ userSelect: 'none', marginTop: '8px' }}
        mode="strong"
        wide
        onClick={onSubmit}
        disabled={disabled}
      >
        {submitText}
      </Button>
      <ErrorBlock>
        {errors}
      </ErrorBlock>
    </div>
  )
}

const ErrorBlock = styled.div`
  margin-top: 24px;
`

Form.propTypes = {
  children: PropTypes.node.isRequired,
  onSubmit: PropTypes.func.isRequired,
  submitText: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  errors: PropTypes.node,
}

Form.defaultProps = {
  submitText: 'Submit',
  disabled: false,
}

export default Form
