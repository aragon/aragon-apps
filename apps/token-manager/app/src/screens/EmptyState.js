import React from 'react'
import { Button, EmptyStateCard, GU } from '@aragon/ui'
import emptyIcon from '../assets/empty-card-icon.svg'

const EmptyState = React.memo(function NoVotes({ onAssignHolder }) {
  return (
    <div
      css={`
        height: calc(100vh - ${8 * GU}px);
        display: flex;
        align-items: center;
        justify-content: center;
      `}
    >
      <EmptyStateCard
        text="There are no tokenholders yet!"
        action={
          <Button wide mode="strong" onClick={onAssignHolder}>
            Add tokens to an address
          </Button>
        }
        illustration={
          <img css="margin: auto;" src={emptyIcon} alt="No tokenholders" />
        }
      />
    </div>
  )
})

export default EmptyState
