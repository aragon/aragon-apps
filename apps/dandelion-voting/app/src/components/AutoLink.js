import React from 'react'
import Linkify from 'react-linkify'
import { Link } from '@aragon/ui'

const AutoLink = ({ children }) => (
  <Linkify component={Link}>{children}</Linkify>
)

export default AutoLink
