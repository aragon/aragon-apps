import BN from 'bn.js'
import { hasLoadedTokenSettings } from './token-settings'

// Convert tokenSupply and holders balances to BNs,
// and calculate tokenDecimalsBase.
function appStateReducer(state) {
  const appStateReady = hasLoadedTokenSettings(state)
  if (!appStateReady) {
    return {
      ...state,
      appStateReady,
    }
  }

  const {
    holders,
    maxAccountTokens,
    tokenDecimals,
    tokenSupply,
    tokenTransfersEnabled,
  } = state

  const tokenDecimalsBase = new BN(10).pow(new BN(tokenDecimals))

  return {
    ...state,
    appStateReady,
    tokenDecimalsBase,

    // Note that numbers in `numData` are not safe for accurate computations
    // (but are useful for making divisions easier)
    numData: {
      tokenDecimals: parseInt(tokenDecimals, 10),
      tokenSupply: parseInt(tokenSupply, 10),
    },
    holders: holders
      ? holders
          .map(holder => ({ ...holder, balance: new BN(holder.balance) }))
          .sort((a, b) => b.balance.cmp(a.balance))
      : [],
    tokenDecimals: new BN(tokenDecimals),
    tokenSupply: new BN(tokenSupply),
    maxAccountTokens: new BN(maxAccountTokens),
    groupMode: tokenTransfersEnabled && maxAccountTokens === '1',
  }
}

export default appStateReducer
