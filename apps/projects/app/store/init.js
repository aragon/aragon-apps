import vaultAbi from '../../../../shared/abi/vault.json'
import standardBounties from '../abi/StandardBounties.json'
import { app, handleEvent, INITIAL_STATE } from './'
import { initializeTokens } from './helpers'

export const initStore = (vaultAddress, standardBountiesAddress, network) => {
  const vaultContract = app.external(vaultAddress, vaultAbi.abi)
  const standardBountiesContract = app.external(standardBountiesAddress, standardBounties.abi)
  const settings = { network }
  return app.store(
    async (state, action) => {
      try {
        return await handleEvent(state, action, vaultAddress, vaultContract, settings)
      } catch (err) {
        console.error(
          `[PROJECTS] store error: ${err}
          event: ${JSON.stringify(action.event, null, 4)}
          state: ${JSON.stringify(state, null, 4)}`
        )
      }
      // always return the state even unmodified
      return state
    },
    {
      externals: [
        // handle vault events
        { contract: vaultContract },
        { contract: standardBountiesContract },
      ],
      init: initState(vaultContract),
    }
  )
}

const initState = (vaultContract) => async (cachedState) => {
  let nextState = await initializeTokens(cachedState || INITIAL_STATE, vaultContract)
  const github = await app.getCache('github').toPromise()
  if (github && github.token) {
    nextState.github = github
  }

  return { ...nextState }
}
