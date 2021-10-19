import React from 'react'
import { GU, Text, useTheme } from '@aragon/ui'

export default function Header({ children }) {
  const theme = useTheme()
  return (
    <Text.Block
      smallcaps
      style={{
        color: theme.contentSecondary,
        marginTop: 2 * GU + 'px',
        marginBottom: GU + 'px',
      }}
    >
      {children}
    </Text.Block>
  )
}
