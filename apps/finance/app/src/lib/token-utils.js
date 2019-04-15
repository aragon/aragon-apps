import { ETHER_TOKEN_VERIFIED_ADDRESSES } from './verified-tokens'
import { toUtf8 } from './web3-utils'
import tokenSymbolAbi from '../abi/token-symbol.json'
import tokenSymbolBytesAbi from '../abi/token-symbol-bytes.json'
import tokenNameAbi from '../abi/token-name.json'
import tokenNameBytesAbi from '../abi/token-name-bytes.json'

// Some known tokens don’t strictly follow ERC-20 and it would be difficult to
// adapt to every situation. The data listed in this map is used as a fallback
// if either some part of their interface doesn't conform to a standard we
// support.
const KNOWN_TOKENS_FALLBACK = new Map([
  [
    'main',
    new Map([
      [
        '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359',
        { symbol: 'DAI', name: 'Dai Stablecoin v1.0', decimals: '18' },
      ],
    ]),
  ],
])

export const ETHER_TOKEN_FAKE_ADDRESS =
  '0x0000000000000000000000000000000000000000'

export const isTokenVerified = (tokenAddress, networkType) =>
  // The verified list is without checksums
  networkType === 'main'
    ? ETHER_TOKEN_VERIFIED_ADDRESSES.has(tokenAddress.toLowerCase())
    : true

export const tokenDataFallback = (tokenAddress, fieldName, networkType) => {
  // The fallback list is without checksums
  const addressWithoutChecksum = tokenAddress.toLowerCase()

  const fallbacksForNetwork = KNOWN_TOKENS_FALLBACK.get(networkType)
  if (
    fallbacksForNetwork == null ||
    !fallbacksForNetwork.has(addressWithoutChecksum)
  ) {
    return null
  }
  return fallbacksForNetwork.get(addressWithoutChecksum)[fieldName] || null
}

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

export async function getTokenName(app, address) {
  // Name is optional; note that aragon.js doesn't return an error (only an falsey value) when
  // getting this value fails
  let token = app.external(address, tokenNameAbi)
  let tokenName = await token.name().toPromise()
  if (tokenName) {
    return tokenName
  }
  // Some tokens (e.g. DS-Token) use bytes32 as the return type for name().
  token = app.external(address, tokenNameBytesAbi)
  tokenName = await token.name().toPromise()

  return tokenName ? toUtf8(tokenName) : null
}
