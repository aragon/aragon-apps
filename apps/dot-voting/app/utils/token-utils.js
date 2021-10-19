import { toUtf8 } from 'web3-utils'
import tokenSymbolAbi from '../../../shared/json-abis/token-symbol.json'
import tokenSymbolBytesAbi from '../../../shared/json-abis/token-symbol-bytes.json'

export const ETHER_TOKEN_FAKE_ADDRESS =
  '0x0000000000000000000000000000000000000000'

export async function getTokenSymbol(app, address) {
  // Symbol is optional; note that aragon.js doesn't return an error (only an falsey value) when
  // getting this value fails
  let token = app.external(address, tokenSymbolAbi)
  let tokenSymbol = await token.symbol().toPromise()
  if (tokenSymbol) {
    return tokenSymbol
  }
  // Some tokens (e.g. DS-Token) use bytes32 as the return type for symbol().
  token = app.external(address, tokenSymbolBytesAbi)
  tokenSymbol = await token.symbol().toPromise()

  return tokenSymbol ? toUtf8(tokenSymbol) : null
}
