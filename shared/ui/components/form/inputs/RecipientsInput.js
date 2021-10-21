import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'
import { Button, IconRemove, theme, unselectable } from '@aragon/ui'

import LocalIdentitiesAutoComplete from './LocalIdentitiesAutoComplete'

const RecipientsInput = ({
  recipients,
  recipientsValid,
  onChange,
}) => {

  const changeRecipient = (value, id) => {
    onChange({
      target: { name: 'recipientsChange', value, id },
    })
  }

  const addRecipient = () => {
    onChange({
      target: {
        name: 'recipientsAdd',
        value: true,
      }
    })
  }

  const removeRecipient = id => {
    onChange({
      target: {
        name: 'recipientsRemove',
        id,
      }
    })
  }

  return (
    <div>
      <div style={flexColumn}>
        { Object.keys(recipients)
          .sort((a, b) => a - b)
          .map((id) => (
            <StyledRecipient key={id}>
              <AutoCompleteWrapper valid={recipientsValid[id]}>
                <LocalIdentitiesAutoComplete
                  value={recipients[id]}
                  onChange={v => changeRecipient(v, id)}
                  wide
                />
              </AutoCompleteWrapper>
              { Object.keys(recipients).length > 1 && (
                <IconContainer
                  style={{ transform: 'scale(.8)' }}
                  onClick={() => removeRecipient(id)}
                  title="Remove this recipient"
                >
                  <IconRemove />
                </IconContainer>
              )}
            </StyledRecipient>
          ))}
      </div>
      <StyledButton
        compact
        mode="secondary"
        onClick={addRecipient}
        title={'Click to add'}
      >
        + Add another
      </StyledButton>
    </div>
  )
}

const StyledButton = styled(Button)`
  font-size: 15px;
  cursor: ${({ disabled }) => (disabled ? 'not-allowed' : 'pointer')};
`

RecipientsInput.propTypes = {
  recipients: PropTypes.object.isRequired,
  recipientsValid: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
}

const flexColumn = { display: 'flex', flexDirection: 'column' }

const StyledRecipient = styled.div`
  display: flex;
  margin-bottom: 0.625rem;
  > :first-child {
    flex-grow: 1;
  }
`

const AutoCompleteWrapper = styled.div`
  border-radius: 6px;
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

export default RecipientsInput
