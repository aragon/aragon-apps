import { ETHER_TOKEN_VERIFIED_ADDRESSES } from './verified-tokens'
import { toUtf8 } from './web3-utils'
import tokenSymbolAbi from '../abi/token-symbol.json'
import tokenSymbolBytesAbi from '../abi/token-symbol-bytes.json'
import tokenNameAbi from '../abi/token-name.json'
import tokenNameBytesAbi from '../abi/token-name-bytes.json'
import tokenDecimalsAbi from '../abi/token-decimals.json'
import { formatDisplayAmount } from './math-utils'

// Some known tokens don’t strictly follow ERC-20 and it would be difficult to
// adapt to every situation. The data listed in this map is used as a fallback
// if either some part of their interface doesn't conform to a standard we
export const ETHER_TOKEN_FAKE_ADDRESS = '0x0000000000000000000000000000000000000000' // support.

const KNOWN_TOKENS_FALLBACK = new Map([
  [
    'main',
    new Map([
      ['0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359', { symbol: 'DAI', name: 'Dai Stablecoin v1.0', decimals: '18' }],
    ]),
  ],
  [
    'private',
    new Map([
      [ETHER_TOKEN_FAKE_ADDRESS, { symbol: 'ETH', name: 'Ether', decimals: '18' }],
      ['0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359', { symbol: 'DAI', name: 'Dai Stablecoin v1.0', decimals: '18' }],
      ['0x0d8775f648430679a709e98d2b0cb6250d2887ef', { symbol: 'BAT', name: 'Bassic attention token', decimals: '18' }],
    ]),
  ],
])

export const isTokenVerified = (tokenAddress, networkType) =>
  // The verified list is without checksums
  networkType === 'main' ? ETHER_TOKEN_VERIFIED_ADDRESSES.has(tokenAddress.toLowerCase()) : true

export const tokenDataFallback = (tokenAddress, fieldName, networkType) => {
  // The fallback list is without checksums
  const addressWithoutChecksum = tokenAddress.toLowerCase()

  const fallbacksForNetwork = KNOWN_TOKENS_FALLBACK.get(networkType)
  if (fallbacksForNetwork == null || !fallbacksForNetwork.has(addressWithoutChecksum)) {
    return null
  }
  return fallbacksForNetwork.get(addressWithoutChecksum)[fieldName] || null
}

export async function getTokenSymbol(app, address) {
  // Symbol is optional; note that aragon.js doesn't return an error (only an falsey value) when
  // getting this value fails
  let tokenSymbol
  let token
  try {
    token = app.external(address, tokenSymbolAbi)
    tokenSymbol = await token.symbol().toPromise()
  } catch (err) {
    // Some tokens (e.g. DS-Token) use bytes32 as the return type for symbol().
    token = app.external(address, tokenSymbolBytesAbi)
    tokenSymbol = toUtf8(await token.symbol().toPromise())
  }

  return tokenSymbol || null
}

export async function getTokenName(app, address) {
  // Name is optional; note that aragon.js doesn't return an error (only an falsey value) when
  // getting this value fails
  let tokenName
  try {
    const token = app.external(address, tokenNameAbi)
    tokenName = await token.name().toPromise()
  } catch (err) {
    // Some tokens (e.g. DS-Token) use bytes32 as the return type for name().
    const token = app.external(address, tokenNameBytesAbi)
    tokenName = toUtf8(await token.name().toPromise())
  }

  return tokenName || null
}

export async function getTokenDecimals(app, address) {
  // Name is optional; note that aragon.js doesn't return an error (only an falsey value) when
  // getting this value fails
  let tokenDecimals
  try {
    const token = app.external(address, tokenDecimalsAbi)
    tokenDecimals = await token.decimals().toPromise()
  } catch (err) {
    console.log(err)
  }

  return tokenDecimals || null
}

export const formatTokenAmountSymbol = (symbol, amount, decimals) => {
  const formattedAmount = formatDisplayAmount(amount, decimals)

  return `${formattedAmount} ${symbol}`
}
