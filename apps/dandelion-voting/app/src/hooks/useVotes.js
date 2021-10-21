import { useMemo } from 'react'
import { useAppState, useCurrentApp, useInstalledApps } from '@aragon/api-react'
import { getVoteTransition } from '../vote-utils'
import { VOTE_ABSENT } from '../vote-types'
import { EMPTY_ADDRESS } from '../web3-utils'
import { useBlockTime, useLatestBlock } from './useBlock'

// Decorate the votes array with more information relevant to the frontend
function useDecoratedVotes() {
  const { votes, connectedAccountVotes } = useAppState()
  const currentApp = useCurrentApp()
  const installedApps = useInstalledApps()

  return useMemo(() => {
    if (!(votes && currentApp && installedApps)) {
      return [[], []]
    }
    const decoratedVotes = votes.map((vote, i) => {
      const executionTargets = vote.data.executionTargets

      let targetApp
      if (!executionTargets) {
        console.warn(
          `Voting: vote #${vote.voteId} does not list any execution targets. The app's cache is likely corrupted and needs to be reset.`
        )
      } else if (!executionTargets.length) {
        // If there's no execution target, consider it targetting this Voting app
        targetApp = {
          ...currentApp,
        }
        delete targetApp.identifier
      } else if (executionTargets.length > 1) {
        // If there's multiple targets, make a "multiple" version
        targetApp = {
          appAddress: EMPTY_ADDRESS,
          name: 'Multiple',
        }
      } else {
        // Otherwise, try to find the target from the installed apps
        const [targetAddress] = executionTargets

        targetApp = installedApps.find(app => app.appAddress === targetAddress)
        if (!targetApp) {
          targetApp = {
            appAddress: targetAddress,
            name: 'External',
          }
        }
      }

      let executionTargetData = {}
      if (targetApp) {
        const { appAddress, icon, identifier, name } = targetApp
        executionTargetData = {
          identifier,
          address: appAddress,
          name,
          // Only try to get the icon if it's available
          iconSrc: typeof icon === 'function' ? icon(24) : null,
        }
      }

      return {
        ...vote,
        executionTargetData,
        connectedAccountVote: connectedAccountVotes[vote.voteId] || VOTE_ABSENT,
      }
    })

    // Reduce the list of installed apps to just those that have been targetted by apps
    const executionTargets = installedApps
      .filter(app =>
        votes.some(vote =>
          (vote.data.executionTargets || []).includes(app.appAddress)
        )
      )
      .map(({ appAddress, identifier, name }) => ({
        appAddress,
        identifier,
        name,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))

    return [decoratedVotes, executionTargets]
  }, [votes, connectedAccountVotes, currentApp, installedApps])
}

// Get the votes array ready to be used in the app.
export default function useVotes() {
  const [votes, executionTargets] = useDecoratedVotes()
  const latestBlock = useLatestBlock()
  const blockTime = useBlockTime()

  const voteStates = useMemo(
    () => votes.map(v => getVoteTransition(v, latestBlock, blockTime)),
    [blockTime, latestBlock, votes]
  )

  const voteStatesKeys = voteStates.map(v => Object.keys(v).join('')).join('')
  return [
    useMemo(() => {
      return votes.map((vote, i) => ({
        ...vote,
        data: {
          ...vote.data,
          ...voteStates[i],
        },
      }))
    }, [votes, voteStatesKeys]), // eslint-disable-line react-hooks/exhaustive-deps
    executionTargets,
    latestBlock.number !== 0,
  ]
}
