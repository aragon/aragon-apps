import styled from 'styled-components'
import { Tag, GU } from '@aragon/ui'

const You = styled(Tag).attrs({
  title: 'This is your Ethereum address',
  children: 'you',
})`
  font-variant: small-caps;
  margin-left: ${1 * GU}px;
`

export default You
