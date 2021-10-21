import { hexToAscii } from 'web3-utils'
import { app } from '../app'

const loadRepoData = id => {
  return new Promise(resolve => {
    app.call('isRepoAdded', id).subscribe(isAddedResponse => {
      if(!isAddedResponse) {
        return resolve({ repoRemoved: true })
      }
      app.call('getRepo', id).subscribe(response => {
        // handle repo removed case
        if (!response) return resolve({ repoRemoved: true })

        return resolve({
          _repo: hexToAscii(id),
          repoRemoved: false,
        })
      })
    })
  })
}

const checkReposLoaded = async (repos, id, transform) => {
  const repoIndex = repos.findIndex(repo => repo.id === id)
  const { repoRemoved, ...data } = await loadRepoData(id)

  if (repoRemoved) return repos

  if (repoIndex === -1) {
    // If we can't find it, load its data, perform the transformation, and concat
    return repos.concat(
      await transform({
        id,
        data: { ...data },
      })
    )
  }

  const nextRepos = Array.from(repos)
  nextRepos[repoIndex] = await transform({
    id,
    data: { ...data },
  })
  return nextRepos
}

const updateState = async (state, id, transform) => {
  try {
    const repos = await checkReposLoaded(state.repos, id, transform)
    const newState = { ...state, repos }
    return newState
  } catch (err) {
    console.error(
      'Update repos failed to return:',
      err,
      'here\'s what returned in NewRepos'
    )
  }
}

export const syncRepos = async (state, { repoId }) => {
  const transform = ({ ...repo }) => ({
    ...repo,
  })
  try {
    let updatedState = await updateState(state, repoId, transform)
    return updatedState
  } catch (err) {
    console.error('updateState failed to return:', err)
    return state
  }
}