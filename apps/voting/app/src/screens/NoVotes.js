import React from 'react'
import { EmptyStateCard, GU, LoadingRing } from '@aragon/ui'
import noVotesSvg from '../assets/no-votes.svg'

const NoVotes = React.memo(function NoVotes({ onClick, isSyncing }) {
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
      actionButton={!isSyncing}
      actionText="Create a new vote"
      icon={<img css="margin: auto;" src={noVotesSvg} alt="No vote here" />}
      onClick={onClick}
    />
  )
})

export default NoVotes
