import React, { useCallback, useMemo } from 'react'
import { addressesEqual } from './web3-utils'

// Know if a vote is beiing challenged and
//the challenger is the connected account.
export function isChallenger(vote, connectedAccount) {
  if (!vote || !connectedAccount) {
    return false
  }

  const isChallenger = useMemo(() => {
    if (
      vote.disputable &&
      vote.disputable.action &&
      vote.disputable.action.state !== 'Submitted' &&
      addressesEqual(
        vote.disputable.action.challenge.challenger,
        connectedAccount
      )
    ) {
      return true
    }
    return false
  }, [vote, connectedAccount])

  return isChallenger
}

export function isSubmitter(vote, connectedAccount) {
  if (!vote || !connectedAccount) {
    return false
  }

  const isSubmitter = useMemo(() => {
    if (
      vote.disputable &&
      vote.disputable.action &&
      addressesEqual(vote.disputable.action.submitter, connectedAccount)
    ) {
      return true
    }
    return false
  }, [vote, connectedAccount])

  return isSubmitter
}

// Handles the disputable logic of the app.
export function useDisputableLogic() {
  return {
    isChallenger,
    isSubmitter,
  }
}
