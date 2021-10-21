import BN from 'bn.js'
import { ETHER_TOKEN_FAKE_ADDRESS } from './lib/token-utils'

const compareBalancesByEthAndSymbol = (tokenA, tokenB) => {
  if (tokenA.address === ETHER_TOKEN_FAKE_ADDRESS) {
    return -1
  }
  if (tokenB.address === ETHER_TOKEN_FAKE_ADDRESS) {
    return 1
  }
  return tokenA.symbol.localeCompare(tokenB.symbol)
}

function appStateReducer(state) {
  const ready = state && state.burnableToken
  if (!ready) return { ready: false }

  const { tokens, burnableToken } = state || {}
  const tokensBn = tokens
    ? tokens
        .map(token => ({
          ...token,
          decimals: new BN(token.decimals),
          amount: new BN(token.amount),
        }))
        .sort(compareBalancesByEthAndSymbol)
    : []

  const { decimals, balance, totalSupply } = burnableToken
  const burnableTokenBn = burnableToken
    ? {
        ...burnableToken,
        decimals: new BN(decimals),
        balance: new BN(balance),
        totalSupply: new BN(totalSupply),
        numData: {
          decimals: parseInt(decimals, 10),
          totalSupply: parseInt(totalSupply, 10),
        },
      }
    : {}

  return {
    ...state,
    ready,
    tokens: tokensBn,
    burnableToken: {
      ...burnableTokenBn,
    },
  }
}

export default appStateReducer
