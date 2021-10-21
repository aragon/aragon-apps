import styled from 'styled-components'
import { Text, theme, unselectable } from '@aragon/ui'

const FieldTitle = styled(Text.Block)`
  ${unselectable};
  color: ${theme.textSecondary};
  text-transform: lowercase;
  font-variant: small-caps;
  font-weight: bold;
`

export default FieldTitle
