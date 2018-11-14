import React from 'react'
import Linkify from 'react-linkify'

const AutoLinks = ({ children }) => (
  <Linkify properties={{ target: '_blank', rel: 'noopener noreferrer' }}>
    {children}
  </Linkify>
)

export default AutoLinks
