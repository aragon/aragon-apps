import React from 'react'
import Linkify from 'react-linkify'
import { Link } from '@aragon/ui'

const InlineLink = props => (
  <Link
    {...props}
    css={`
      display: inline;
      white-space: normal;
    `}
  />
)

const AutoLink = ({ children }) => (
  <Linkify component={InlineLink}>{children}</Linkify>
)

export default AutoLink
