import { ETHER_TOKEN_VERIFIED_ADDRESSES } from './verified-tokens'
import { toUtf8 } from './web3-utils'
import tokenSymbolBytes from '../abi/token-symbol-bytes.json'
import tokenDecimalsAbi from '../abi/token-decimals.json'
import tokenBalanceOfAbi from '../abi/token-balanceof.json'
import tokenNameAbi from '../abi/token-name.json'
import tokenSymbolAbi from '../abi/token-symbol.json'

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

export async function getTokenSymbol (app, address){
  const tokenAbi = [].concat(tokenBalanceOfAbi,tokenDecimalsAbi,tokenSymbolAbi)
  const token = app.external(address,tokenAbi)
  const tokenSymbol = await token
    .symbol()
    .first()
    .toPromise()
  if (tokenSymbol){
    return tokenSymbol

  }else{
    // Now we try with symbol as bytes32
    const tokenAbi = [].concat(tokenBalanceOfAbi,tokenDecimalsAbi,tokenSymbolBytes)
    const token = app.external(address,tokenAbi)
    const tokenSymbol = await token
    .symbol()
    .first()
    .toPromise()
    if (tokenSymbol){
      return toUtf8(tokenSymbol)

    }else{
      return null
    }
  }
}