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
    <React.Fragment>
      <VerticalSpace />
      {children}
      <Button
        style={{ userSelect: 'none', marginTop: '24px' }}
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
    </React.Fragment>
  )
}

const ErrorBlock = styled.div`
  margin-top: 24px;
`

const VerticalSpace = styled.div`
  height: 24px;
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
