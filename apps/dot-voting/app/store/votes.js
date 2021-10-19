import { combineLatest, from } from 'rxjs'
import { first, map, mergeMap } from 'rxjs/operators'

import { app } from './'
import { EMPTY_CALLSCRIPT } from '../utils/vote-utils'
import { ETHER_TOKEN_FAKE_ADDRESS, tokenAbi } from '../../../../shared/lib/token-utils'
import { loadTokenSymbol } from '../../../../shared/store-utils/token'
import { addressesEqual } from '../../../../shared/lib/web3-utils'
import allocationsAbi from '../../../../shared/abi/allocations.json'

export const castVote = async (state, { voteId }, settings) => {
  const transform = async vote => ({
    ...vote,
    data: await loadVoteData(voteId, settings),
  })

  return updateState(state, voteId, transform)
}

export const executeVote = async (state, { voteId }, settings) => {
  const transform = ({ data, ...vote }) => ({
    ...vote,
    data: { ...data, executed: true },
  })
  return updateState(state, voteId, transform, settings)
}

export const startVote = async (state, { voteId }, settings) => {
  return updateState(state, voteId, vote => vote, settings)
}

/***********************
   *                     *
   *       Helpers       *
   *                     *
   ***********************/

const loadVoteDescription = async (vote) => {
  if (!vote.executionScript || vote.executionScript === EMPTY_CALLSCRIPT) {
    return vote
  }

  const path = await app.describeScript(vote.executionScript).toPromise()

  vote.executionTargets = [...new Set(path.map(({ to }) => to))]
  vote.description = path
    .map(step => {
      const identifier = step.identifier ? ` (${step.identifier})` : ''
      const app = step.name ? `${step.name}${identifier}` : `${step.to}`

      return `${app}: ${step.description || 'No description'}`
    })
    .join('\n')

  return vote
}

const loadVoteData = async (voteId, settings) => {
  return new Promise(resolve => {
    app
      .call('getVote', voteId)
      .pipe(first())
      .subscribe(async voteData => {
        let funcSig = voteData.executionScript.slice(58, 66)
        if (funcSig == 'b3670f9e') {
          resolve(loadVoteDataProjects(voteData, voteId))
        } else {
          resolve(loadVoteDataAllocation(voteData, voteId, settings))
        }
      })
  })
}

// These functions arn't DRY make them better
const loadVoteDataAllocation = async (vote, voteId, settings) => {
  return new Promise(resolve => {
    combineLatest(
      app.call('getVoteMetadata', voteId),
      app.call('getCandidateLength', voteId),
      app.call('canExecute', voteId)
    )
      .pipe(first())
      .subscribe(async ([ metadata, totalCandidates, canExecute ]) => {
        const voteDescription = await loadVoteDescription(vote)
        const decoratedVote = await decorateVote(voteDescription)
        let options = []
        for (let i = 0; i < totalCandidates; i++) {
          const candidateData = await getAllocationCandidate(voteId, i)
          options.push(candidateData)
        }
        options = await Promise.all(options)

        const returnObject = {
          ...marshallVote(decoratedVote),
          metadata,
          canExecute,
          options,
        }
        // allocations appProxy address starts at 10 and is 20 bytes (40 chars) long
        const allocationsAddress = '0x' + vote.executionScript.slice(10,50)
        // account Address starts at 514 and is stored as as uint256, which is 32 bytes (64 chars) long
        const allocationsAccountId = parseInt(vote.executionScript.slice(514, 578), 16).toString()
        // compose a callable external contract from the parsed address and the abi
        const allocationsInstance = app.external(allocationsAddress, allocationsAbi)
        const { token: tokenAddress } = await allocationsInstance.getAccount(allocationsAccountId).toPromise()

        let symbol
        if (tokenAddress === ETHER_TOKEN_FAKE_ADDRESS) {
          symbol = 'ETH'
        }
        else {
          const tokenContract = app.external(tokenAddress, tokenAbi)
          symbol = await loadTokenSymbol(tokenContract, tokenAddress, settings)
        }


        resolve({
          ...returnObject,
          // // These numbers indicate the static param location of the setDistribution
          // // functions amount paramater
          balance: parseInt(vote.executionScript.slice(770, 834), 16),
          tokenSymbol: symbol,
          metadata: vote.voteDescription,
          type: 'allocation',
        })
      })
  })
}

const loadVoteDataProjects = async (vote, voteId) => {
  return new Promise(resolve => {
    combineLatest(
      app.call('getCandidateLength', voteId),
      app.call('canExecute', voteId)
    )
      .pipe(first())
      .subscribe(async ([ totalCandidates, canExecute ]) => {
        const voteDescription = await loadVoteDescription(vote)
        const decoratedVote = await decorateVote(voteDescription)
        let options = []
        for (let i = 0; i < totalCandidates; i++) {
          let candidateData = await getProjectCandidate(voteId, i)
          options.push(candidateData)
        }
        resolve({
          ...marshallVote(decoratedVote),
          metadata: vote.voteDescription,
          type: 'curation',
          canExecute,
          options,
        })
      })
  })
}

const updateVotes = async (votes, voteId, transform, settings) => {
  const voteIndex = votes.findIndex(vote => vote.voteId === voteId)
  let nextVotes = Array.from(votes)
  if (voteIndex === -1) {
    // If we can't find it, load its data, perform the transformation, and concat
    nextVotes = votes.concat(
      await transform({
        voteId,
        data: await loadVoteData(voteId, settings),
      })
    )
  } else {
    nextVotes[voteIndex] = await transform(nextVotes[voteIndex])
  }
  return nextVotes
}

const getAllocationCandidate = async (voteId, candidateIndex) => {
  return new Promise(resolve => {
    app
      .call('getCandidate', voteId, candidateIndex)
      .pipe(first())
      .subscribe(candidateData => {
        resolve({
          label: candidateData.candidateAddress,
          value: candidateData.voteSupport,
        })
      })
  })
}

const getProjectCandidate = async (voteId, candidateIndex) => {
  return new Promise(resolve => {
    app
      .call('getCandidate', voteId, candidateIndex)
      .pipe(first())
      .subscribe(candidateData => {
        resolve({
          label: candidateData.metadata,
          value: candidateData.voteSupport,
        })
      })
  })
}

const updateState = async (state, voteId, transform, settings) => {
  let { votes = [] } = state ? state : []
  votes = await updateVotes(votes, voteId, transform, settings)
  return {
    ...state,
    votes: votes,
  }
}

const marshallVote = ({
  open,
  creator,
  startDate,
  snapshotBlock,
  candidateSupport,
  totalVoters,
  totalParticipation,
  metadata,
  executionScript,
  executionTargetData,
  executed,
}) => {
  totalVoters = parseInt(totalVoters, 10)
  totalParticipation = parseInt(totalParticipation, 10)
  return {
    open,
    creator,
    startDate: parseInt(startDate, 10) * 1000, // adjust for js time (in ms vs s)
    snapshotBlock: parseInt(snapshotBlock, 10),
    candidateSupport: parseInt(candidateSupport, 10),
    totalVoters: totalVoters,
    totalParticipation: totalParticipation,
    metadata,
    executionScript,
    executionTargetData,
    executed,
    participationPct:
      totalVoters === 0 ? 0 : (totalParticipation / totalVoters) * 100,
  }
}

const getVoteExecutionTargets = (vote) => {
  return vote.executionTargets || []
}

const decorateVote = async (vote) => {
  const executionTargets = getVoteExecutionTargets(vote)
  const currentApp = await app.currentApp().toPromise()
  if (!executionTargets.length) {
    // If there's no execution target, consider it targetting this Dot Voting app
    return {
      ...vote,
      executionTargetData: {
        ...currentApp,
        identifier: undefined,
      }
    }
  } else if (executionTargets.length > 1) {
    // If there's multiple targets, make a "multiple" version
    return {
      ...vote,
      executionTargetData: {
        address: '0x0000000000000000000000000000000000000000',
        name: 'Multiple',
        iconSrc: currentApp.icon(24),
        identifier: undefined,
      }
    }
  } else {
    // Otherwise, try to find the target from the installed apps
    const [targetAddress] = executionTargets
    return app.installedApps().pipe(
      first(),
      mergeMap(installedApps => from(installedApps)),
      first(
        app => addressesEqual(app.appAddress, targetAddress),
        {
          appAddress: targetAddress,
          name: 'External',
          icon: currentApp.icon,
          identifier: undefined,
        }
      ),
      map(targetApp => ({
        ...vote,
        executionTargetData: {
          address: targetApp.appAddress,
          name: targetApp.name,
          /*
          icon() function takes pixel size as a paremeter (in our case 24px)
          and returns the location of the app icon. However, in most (all?)
          cases it just returns an svg which can be any size.
          */
          iconSrc: targetApp.icon(24),
          identifier: targetApp.identifier,
        }
      }))
    ).toPromise()
  }
}
