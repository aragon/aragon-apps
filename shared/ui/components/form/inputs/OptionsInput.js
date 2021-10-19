import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'
import { Button, IconRemove, TextInput, theme, unselectable } from '@aragon/ui'

const OptionsInput = ({
  input,
  name,
  onChange,
  placeholder = '',
  validator,
  values,
}) => {
  const validated = !input || validator(values, input.addr)

  const addOption = () => {
    onChange({
      target: validated
        ? { name, value: [ ...values, input ] }
        : { name: 'addressError', value: true }, // enable error msg if needed
    })
    cleanInputBox()
  }

  const removeOption = option => {
    // perform the change on the parent by using onChange prop without modifying value prop
    option &&
      onChange({ target: { name, value: values.filter(v => v !== option) } })
  }

  const cleanInputBox = () => {
    onChange({ target: { name: 'userInput', value: { addr: '' } } })
  }

  const onChangeInput = ({ target: { value } }) => {
    onChange({
      target: { name: 'userInput', value: { addr: value } },
    })
  }

  const loadOptions = values.map((option, i) => (
    <StyledOption key={i}>
      <StyledInput readOnly value={option.addr} />
      <IconContainer
        style={{ transform: 'scale(.8)' }}
        onClick={() => removeOption(option)}
        title="Click to remove the option"
        children={<IconRemove />}
      />
    </StyledOption>
  ))

  return (
    <div style={{ paddingTop: '10px' }}>
      <div style={flexColumn}>
        {loadOptions}
        <StyledOption>
          <StyledInput
            placeholder={placeholder}
            value={input.addr}
            onChange={onChangeInput}
          />
          <IconContainer
            style={{ transform: 'scale(.8)' }}
            onClick={() => removeOption()}
            title="Click to remove the option"
            children={<IconRemove />}
          />
        </StyledOption>
      </div>
      <StyledButton
        disabled={!validated}
        compact
        mode="secondary"
        onClick={addOption}
        children={'+ Add option'}
        title={validated ? 'Click to add' : ''}
      />
    </div>
  )
}

const StyledButton = styled(Button)`
  font-size: 15px;
  margin-top: 10px;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
`

OptionsInput.propTypes = {
  input: PropTypes.object.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  placeholder: PropTypes.string,
  validator: PropTypes.func.isRequired,
  values: PropTypes.array.isRequired,
}

const flexColumn = { display: 'flex', flexDirection: 'column' }

const StyledOption = styled.div`
  display: flex;
  margin-bottom: 0.625rem;
  > :first-child {
    flex-grow: 1;
  }
`

const StyledInput = styled(TextInput)`
  ${unselectable}; /* it is possible to select the placeholder without this */
  ::placeholder {
    color: ${theme.contentBorderActive};
  }
  :focus {
    border-color: ${theme.contentBorderActive};
    ::placeholder {
      color: ${theme.contentBorderActive};
    }
  }
  :read-only {
    cursor: default;
    :focus {
      border-color: ${theme.positive};
    }
  }
`

const IconContainer = styled.button`
  ${unselectable};
  all: unset;
  color: ${({ disabled }) => (disabled ? theme.disabled : theme.textSecondary)};
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
  display: flex;
  justify-content: center;
  :hover {
    color: ${({ disabled }) =>
    disabled ? theme.disabled : theme.contentBorderActive};
  }
  :active {
    color: ${({ disabled }) => (disabled ? theme.disabled : theme.accent)};
  }
  > svg {
    color: inherit;
    height: 40px;
    width: 40px;
    transition: all 0.6s cubic-bezier(0.165, 0.84, 0.44, 1);
  }
`

export default OptionsInput
