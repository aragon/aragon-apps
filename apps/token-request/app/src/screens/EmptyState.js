import React from 'react'
import { Text, Box } from '@aragon/ui'

const EmptyState = text => {
  return (
    <Box style={{ textAlign: 'center' }}>
      <Text>{text}</Text>
    </Box>
  )
}

export default EmptyState
