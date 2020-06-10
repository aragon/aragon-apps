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
    vestings,
  } = state

  const tokenDecimalsBase = new BN(10).pow(new BN(tokenDecimals))

  return {
    ...state,
    appStateReady,
    tokenDecimalsBase,

    maxAccountTokens: new BN(maxAccountTokens),
    groupMode: tokenTransfersEnabled && maxAccountTokens === '1',

    // Note that numbers in `numData` are not safe for accurate computations
    // (but are useful for making divisions easier)
    numData: {
      tokenDecimals: parseInt(tokenDecimals, 10),
      tokenSupply: parseInt(tokenSupply, 10),
    },
    tokenDecimals: new BN(tokenDecimals),
    tokenSupply: new BN(tokenSupply),

    holders: holders
      ? holders
          .map(holder => ({ ...holder, balance: new BN(holder.balance) }))
          .sort((a, b) => b.balance.cmp(a.balance))
      : [],

    vestings: vestings
      ? Object.entries(vestings).reduce(
          (vestings, [address, vestingsForAddress]) => {
            vestings[address] = vestingsForAddress.map(vesting => {
              const { data } = vesting

              return {
                ...vesting,
                data: {
                  ...data,
                  amount: new BN(data.amount),
                  cliff: new Date(data.cliff),
                  start: new Date(data.start),
                  vesting: new Date(data.vesting),
                },
              }
            })

            return vestings
          },
          {}
        )
      : {},
  }
}

export default appStateReducer
