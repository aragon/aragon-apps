import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import { Box, GU, useTheme } from '@aragon/ui'
import noTransfersSvg from './assets/no-transfers.svg'

function EmptyTransactions() {
  const { appState } = useAragonApi()
  const theme = useTheme()

  return (
    <Box>
      <div
        css={`
          margin: ${15 * GU}px auto;
          display: flex;
          flex-direction: column;
          align-items: center;
        `}
      >
        <img
          css={`
            margin: ${4 * GU}px 0;
            height: 176px;
          `}
          src={noTransfersSvg}
          alt="No transfers"
        />
        <h3
          css={`
            font-size: 28px;
            color: ${theme.content};
          `}
        >
          {appState.isSyncing ? 'Loading…' : 'No transfers yet!'}
        </h3>
      </div>
    </Box>
  )
}

export default React.memo(EmptyTransactions)
