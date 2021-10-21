import PropTypes from 'prop-types'
import React from 'react'
import { DropDown, TextInput, theme } from '@aragon/ui'
import styled from 'styled-components'

// TODO: Better naming
const InputDropDown = ({ textInput, dropDown, wide }) => (
  <StyledInputDropDown wide={wide}>
    <TextInput {...textInput} />
    <DropDown {...dropDown} />
  </StyledInputDropDown>
)

InputDropDown.propTypes = {
  textInput: PropTypes.object,
  dropDown: PropTypes.object,
  wide: PropTypes.bool,
}

const StyledInputDropDown = styled.div`
  display: flex;
  min-width: 0;
  > :first-child {
    border-radius: 3px 0 0 3px;
    border: 1px solid ${theme.contentBorder};
    box-shadow: 0 4px 4px 0 rgba(0, 0, 0, 0.03);
    min-width: 84px;
    flex: ${({ wide }) => (wide ? 1 : 0)};
    z-index: 1;
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

// eslint-disable-next-line import/no-unused-modules
export default InputDropDown
