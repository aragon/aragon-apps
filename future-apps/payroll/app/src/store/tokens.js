import app from './app'
import tokenDecimalsAbi from './abi/token-decimals'
import tokenSymbolAbi from './abi/token-symbol'

const tokenCache = new Map()

export function getDenominationToken () {
  return app.call('denominationToken')
    .first()
    .map(getToken)
    .toPromise()
}

export async function getToken (address) {
  if (!tokenCache.has(address)) {
    const [decimals, symbol] = await Promise.all([
      loadTokenDecimals(address),
      loadTokenSymbol(address)
    ])

    tokenCache.set(address, { address, decimals, symbol })
  }

  return tokenCache.get(address)
}

function loadTokenDecimals (address) {
  return app.external(address, tokenDecimalsAbi)
    .decimals()
    .first()
    .map(value => parseInt(value))
    .toPromise()
}

function loadTokenSymbol (address) {
  return app.external(address, tokenSymbolAbi)
    .symbol()
    .first()
    .toPromise()
}
