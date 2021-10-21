import {
  getEthToken,
  getNetwork,
  getVault,
  initializeTokens,
  storeHandler,
} from '../../../../shared/store-utils'
import allocationsEventHandler from './events'

const initState = settings => async cachedState => {
  return await initializeTokens(cachedState, settings)
}

const initialize = async () => {
  const settings = {
    ethToken: getEthToken(),
    network: await getNetwork(),
    vault: await getVault(),
  }

  const storeOptions = {
    externals: [settings.vault],
    init: initState(settings),
  }

  return storeHandler(settings, allocationsEventHandler, storeOptions)
}

export default initialize
