import { useMemo } from 'react'
import { useAppState } from '@aragon/api-react'
import { isVoteOpen } from '../vote-utils'
import { VOTE_ABSENT } from '../vote-types'
import useNow from './useNow'
//
// Get the votes array ready to be used in the app.
export default function useVotes() {
  const { votes, connectedAccountVotes } = useAppState()
  const now = useNow()

  const openedStates = (votes || []).map(v => isVoteOpen(v, now))
  const openedStatesKey = openedStates.join('')

  return useMemo(() => {
    if (!votes) {
      return []
    }
    return votes.map((vote, i) => ({
      ...vote,
      data: {
        ...vote.data,

        metadata: vote.data.metadata || '',
        description: vote.data.description || '',
        open: openedStates[i],
      },
      connectedAccountVote: connectedAccountVotes[vote.voteId] || VOTE_ABSENT,
    }))
  }, [votes, connectedAccountVotes, openedStatesKey]) // eslint-disable-line react-hooks/exhaustive-deps
}
