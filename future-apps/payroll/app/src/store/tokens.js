import app from './app'
import tokenDecimalsAbi from '../abi/token-decimals'
import tokenSymbolAbi from '../abi/token-symbol'

const tokenCache = new Map()

export async function getDenominationToken() {
  const denominationToken = await app.call('denominationToken').toPromise()
  return getToken(denominationToken)
}

export async function getToken(address) {
  if (!tokenCache.has(address)) {
    const tokenContract = app.external(
      address,
      [].concat(tokenDecimalsAbi, tokenSymbolAbi)
    )
    const [decimals, symbol] = await Promise.all([
      loadTokenDecimals(tokenContract),
      loadTokenSymbol(tokenContract),
    ])

    tokenCache.set(address, { address, decimals, symbol })
  }

  return tokenCache.get(address)
}

async function loadTokenDecimals(tokenContract) {
  const decimals = tokenContract.decimals().toPromise()
  return parseInt(decimals, 10)
}

function loadTokenSymbol(tokenContract) {
  return tokenContract.symbol().toPromise()
}
