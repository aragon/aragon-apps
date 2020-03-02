import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import { Box, LoadingRing, GU, textStyle, useTheme } from '@aragon/ui'
import noResultsSvg from './assets/no-results.svg'

const EmptyTransactions = React.memo(function EmptyTransactions() {
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
          src={noResultsSvg}
          alt=""
        />
        <h3
          css={`
            ${textStyle('title2')}
            color: ${theme.surfaceContent}
          `}
        >
          {appState.isSyncing ? (
            <div
              css={`
                display: grid;
                align-items: center;
                justify-content: center;
                grid-template-columns: auto auto;
                grid-gap: ${1 * GU}px;
              `}
            >
              <LoadingRing />
              <span>Loading…</span>
            </div>
          ) : (
            'No transfers yet!'
          )}
        </h3>
      </div>
    </Box>
  )
})

export default EmptyTransactions
