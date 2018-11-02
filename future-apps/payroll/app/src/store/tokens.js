import app from './app'
import tokenDecimalsAbi from './abi/token-decimals'
import tokenSymbolAbi from './abi/token-symbol'

export async function loadTokenInfo (address) {
  const [decimals, symbol] = await Promise.all([
    loadTokenDecimals(address),
    loadTokenSymbol(address)
  ])

  return { address, decimals, symbol }
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
