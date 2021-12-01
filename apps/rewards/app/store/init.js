import vaultAbi from '../../../../shared/abi/vault.json'
import { initializeTokens } from './token'
import { app, handleEvent } from './'
import { ETHER_TOKEN_FAKE_ADDRESS } from '../../../../shared/lib/token-utils'

export const initStore = (vaultAddress, network) => {
  const vaultContract = app.external(vaultAddress, vaultAbi.abi)
  const settings = {
    network,
    vault: {
      address: vaultAddress,
      contract: vaultContract,
    },
    ethToken: {
      address: ETHER_TOKEN_FAKE_ADDRESS,
    },
  }
  return app.store(
    async (state, event) => {
      // ensure there are initial placeholder values
      let initialState = { ...state }
      try {
        const next = await handleEvent(state, event, settings)
        const nextState = { ...initialState, ...next }
        // Debug point
        return nextState
      } catch (err) {
        console.error('[Rewards script] initStore', event, err)
      }
      return state
    },
    {
      init: initState(settings),
      externals: [
        {
          contract: vaultContract,
        },
      ],
    }
  )
}

const initState = (settings) => async cachedState => {
  const newState = {
    ...cachedState,
    isSyncing: true,
    vaultAddress: settings.vault.address,
  }
  const tokenState = await initializeTokens(newState, settings)
  return tokenState
}
