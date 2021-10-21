import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import NumberFormat from 'react-number-format'
import { useTheme } from '@aragon/ui'

const NumberInput = ({ className, ...props }) => {
  const theme = useTheme()
  return (
    <Wrap className={className} theme={theme}>
      <Input {...props} />
    </Wrap>
  )
}

NumberInput.propTypes = {
  className: PropTypes.string,
}

// wrapping the input allows `flex: 1` to be set on NumberInput so that it can
// expand to the available width, without the left-right padding causing the
// containing row to expand beyond the desired bounds
const Wrap = styled.div`
  border-radius: 3px;
  border: 1px solid #e6e6e6;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);
  :focus-within {
    border: 1px solid ${props => props.theme.accent};
  }
`

const Input = styled(NumberFormat)`
  border: none;
  border-radius: 3px;
  height: 38px;
  font-size: 16px;
  line-height: 1.5;
  padding: 0 10px;
  text-align: right;
  width: 100%;
  :focus {
    outline: 0;
  }
`

export default NumberInput
