import { app } from '../app'
import tokenSymbolAbi from '../../abi/token-symbol.json'
import tokenDecimalsAbi from '../../abi/token-decimal.json'
import { loadTokenSymbol, loadTokenDecimals } from '../../../../../shared/store-utils/token'

const ETHER_TOKEN_FAKE_ADDRESS = '0x0000000000000000000000000000000000000000'

const tokenAbi = [].concat(tokenDecimalsAbi, tokenSymbolAbi)

export const initializeTokens = async (state, vaultContract, settings) => {
  const nextState = state.tokens.find(t => t.symbol === 'ETH') ? state : {
    ...state,
    tokens: [{
      addr: ETHER_TOKEN_FAKE_ADDRESS,
      symbol: 'ETH',
      decimals: '18',
    }]
  }
  return await syncTokens(nextState, { token: ETHER_TOKEN_FAKE_ADDRESS }, vaultContract, settings)
}

export const syncTokens = async (state, { token }, vaultContract, settings) => {
  try {
    const tokens = state.tokens
    let tokenIndex = tokens.findIndex(currentToken => currentToken.addr === token)
    if(tokenIndex === -1) {
      let newToken = await loadToken(token, vaultContract, settings)
      tokenIndex = tokens.findIndex(currentToken => currentToken.symbol === newToken.symbol)
      if(tokenIndex !== -1) {
        tokens[tokenIndex] = newToken
      }
      else {
        tokens.push(newToken)
      }
    }

    else {
      tokens[tokenIndex].balance = await loadTokenBalance(token, vaultContract)
    }
    return state
  } catch (err) {
    console.error('[Projects script] syncSettings settings failed:', err)
    return state
  }
}

const loadTokenBalance = (tokenAddress, vaultContract) => {
  return vaultContract.balance(tokenAddress).toPromise()
}

const loadToken = async (tokenAddress, vaultContract, settings) => {
  const tokenContract = app.external(tokenAddress, tokenAbi)

  const [ balance, decimals, symbol ] = await Promise.all([
    loadTokenBalance(tokenAddress, vaultContract),
    loadTokenDecimals(tokenContract, tokenAddress, settings),
    loadTokenSymbol(tokenContract, tokenAddress, settings),
  ])

  return ({
    addr: tokenAddress,
    symbol: symbol,
    decimals: decimals,
    balance: balance,
  })
}
