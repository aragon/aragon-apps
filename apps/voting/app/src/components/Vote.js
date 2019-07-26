import React from 'react'
import { Box, Split } from '@aragon/ui'

function Vote({ vote }) {

  return (
    <Split
      primary={<Box>Vote content</Box>}
      secondary={
        <React.Fragment>
          <Box heading="Status">Content</Box>
          <Box heading="Relative support %">Content</Box>
          <Box heading="Minimum approval %">Content</Box>
        </React.Fragment>
      }
    />
  )
}

export default Vote
