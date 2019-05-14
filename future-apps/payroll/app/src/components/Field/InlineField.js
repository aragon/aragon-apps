import styled from 'styled-components'
import { Field } from '@aragon/ui'

const InlineField = styled(Field)`
  label {
    display: flex;
    align-items: center;

    > :first-child {
      margin-left: 0.5rem;
      margin-right: 0.75rem;
    }
  }
`

export default InlineField
