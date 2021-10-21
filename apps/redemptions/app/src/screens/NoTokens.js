import React from 'react'
import { Button, EmptyStateCard, GU, LoadingRing } from '@aragon/ui'

const NoTokens = React.memo(({ onNewToken, isSyncing }) => {
  return (
    <EmptyStateCard
      text={
        isSyncing ? (
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
            <span>Syncing…</span>
          </div>
        ) : (
          'Add tokens to get started.'
        )
      }
      action={
        <Button wide mode="strong" onClick={onNewToken}>
          Add token
        </Button>
      }
    />
  )
})

export default NoTokens
