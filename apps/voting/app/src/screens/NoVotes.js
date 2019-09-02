import React from 'react'
import { Button, EmptyStateCard, GU, LoadingRing } from '@aragon/ui'
import noVotesPng from '../assets/no-votes.png'

const NoVotes = React.memo(function NoVotes({ onNewVote, isSyncing }) {
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
          'No votes here!'
        )
      }
      action={
        <Button wide mode="strong" onClick={onNewVote}>
          Create a new vote
        </Button>
      }
      illustration={
        <img
          css={`
            margin: auto;
            height: 170px;
          `}
          src={noVotesPng}
          alt="No vote here"
        />
      }
    />
  )
})

export default NoVotes
