import { app, handleEvent } from './'
import { initEthToken } from '../../../../shared/store-utils/token'

export const initStore = (network) => {
  const initialState = {
    votes: [],
    isSyncing: false,
  }
  const settings = { network }
  return app.store(
    async (state, event) => {
      // ensure there are initial placeholder values
      if (!state) state = initialState

      try {
        const next = await handleEvent(state, event, settings)
        const nextState = { ...initialState, ...next }
        // Debug point
        return nextState
      } catch (err) {
        console.error('[Dot Voting script] initStore', event, err)
      }
      // always return the state even unmodified
      return state
    },
    {
      init: initState(),
    }
  )
}

const initState = () => async cachedState => {
  initEthToken()
  const newState = {
    ...cachedState,
    isSyncing: true,
  }
  return newState
}
