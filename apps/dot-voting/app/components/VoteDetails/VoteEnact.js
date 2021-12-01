import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { useAragonApi } from '../../api-react'
import { Button, Info } from '@aragon/ui'

const VoteEnact = ({ voteId }) => {
  const { api } = useAragonApi()

  const handleExecuteVote = useCallback(async () => {
    await api.executeVote(voteId).toPromise()
  }, [ api, voteId ])

  return (
    <div>
      <Button
        mode="strong"
        wide
        onClick={handleExecuteVote}
        css="margin: 10px 0"
      >
          Execute vote
      </Button>
      <Info>
        The voting period is closed and the vote status is passed. <span css="font-weight: bold">Anyone</span> can now enact this vote to execute its action.
      </Info>
    </div>
  )
}

VoteEnact.propTypes = {
  voteId: PropTypes.string.isRequired,
}

export default VoteEnact
