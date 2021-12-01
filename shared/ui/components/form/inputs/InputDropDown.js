import PropTypes from 'prop-types'
import React from 'react'
import { DropDown, TextInput, theme } from '@aragon/ui'
import styled from 'styled-components'

// TODO: Better naming
const InputDropDown = ({ textInput, dropDown }) => {
  return (
    <StyledInputDropDown>
      <TextInput {...textInput} />
      <DropDown {...dropDown} />
    </StyledInputDropDown>
  )
}

InputDropDown.propTypes = {
  textInput: PropTypes.object,
  dropDown: PropTypes.object,
}

const StyledInputDropDown = styled.div`
  flex: 1;
  display: flex;
  > :first-child {
    border-radius: 3px 0 0 3px;
    border: 1px solid ${theme.contentBorder};
    box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.03);
    max-width: 85px;
    z-index: 1;
    flex: 1;
    :focus {
      outline: 0;
      border: 1px solid ${theme.contentBorderActive};
    }
  }
  > :last-child > :first-child {
    border-radius: 0 3px 3px 0;
    margin-left: -1px;
  }
`

export default InputDropDown
