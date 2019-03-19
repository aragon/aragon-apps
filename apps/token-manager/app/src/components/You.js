import React from 'react'
import styled from 'styled-components'
import { Badge } from '@aragon/ui'

const You = styled(Badge.Identity).attrs({
  title: 'This is your Ethereum address',
  children: 'you',
})`
  font-variant: small-caps;
  margin-left: 10px;
`

export default You
