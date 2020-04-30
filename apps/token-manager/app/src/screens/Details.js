import React from 'react'
import { GU } from '@aragon/ui'

function Details() {
  return (
    <div
      css={`
        height: calc(100vh - ${8 * GU}px);
        display: flex;
        align-items: center;
        justify-content: center;
      `}
    >
      Vesting details page
    </div>
  )
}

export default Details
