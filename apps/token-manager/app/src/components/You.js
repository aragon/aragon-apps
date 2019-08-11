import styled from 'styled-components'
import { Badge, GU } from '@aragon/ui'

const You = styled(Badge.Identity).attrs({
  title: 'This is your Ethereum address',
  children: 'you',
})`
  font-variant: small-caps;
  margin-left: ${1 * GU}px;
`

export default You
