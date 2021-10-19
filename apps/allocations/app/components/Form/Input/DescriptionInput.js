import PropTypes from 'prop-types'
import styled from 'styled-components'
import { TextInput, theme } from '@aragon/ui'

const DescriptionInput = styled(TextInput).attrs({
  wide: true,
})`
  resize: none; /* TODO: Should we have the ability to resize the form? */
  padding: 10px;
  ::placeholder {
    color: ${theme.contentBorderActive};
  }
  :focus {
    border-color: ${theme.contentBorderActive};
    ::placeholder {
      color: ${theme.contentBorderActive};
    }
  }
`

DescriptionInput.propTypes = {
  rows: PropTypes.string,
  placeholder: PropTypes.string,
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
}

export default DescriptionInput
