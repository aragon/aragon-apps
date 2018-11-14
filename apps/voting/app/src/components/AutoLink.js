import React from 'react'
import Linkify from 'react-linkify'
import { SafeLink } from '@aragon/ui'

const AutoLink = ({ children }) => (
  <Linkify component={SafeLink} properties={{ target: '_blank' }}>
    {children}
  </Linkify>
)

export default AutoLink
