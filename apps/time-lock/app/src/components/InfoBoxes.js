import React from 'react'

import { Box, GU, Info } from '@aragon/ui'

import LockSettings from './LockSettings'

const InfoBoxes = React.memo(props => {
  return (
    <>
      <Box heading="Lock info">
        <LockSettings {...props} />
      </Box>
      <Info
        mode="warning"
        css={`
          margin: ${1 * GU}px 0;
        `}
      >
        You can withdraw your tokens once they unlock
      </Info>
    </>
  )
})

export default InfoBoxes
