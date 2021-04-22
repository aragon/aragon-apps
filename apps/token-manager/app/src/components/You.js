import React from 'react'
import { Tag, GU } from '@conflux-/aragon-ui'

const You = props => (
  <Tag
    css={`
      margin-left: ${0.5 * GU}px;
    `}
    size="small"
    {...props}
  >
    you
  </Tag>
)

export default You
