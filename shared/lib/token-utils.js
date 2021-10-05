import { ETHER_TOKEN_VERIFIED_ADDRESSES } from './verified-tokens'
import { toUtf8 } from './web3-utils'
import tokenBalanceAbi from '../abi/token-balanceof.json'
import tokenDecimalsAbi from '../abi/token-decimals.json'
import tokenDecimals256Abi from '../abi/token-decimals256.json'
import tokenNameAbi from '../abi/token-name.json'
import tokenNameBytesAbi from '../abi/token-name-bytes.json'
import tokenSymbolAbi from '../abi/token-symbol.json'
import tokenSymbolBytesAbi from '../abi/token-symbol-bytes.json'

const ANT_MAINNET_TOKEN_ADDRESS = '0x960b236A07cf122663c4303350609A66A7B288C0'
const SAI_MAINNET_TOKEN_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359'

export const tokenAbi = [].concat(
  tokenSymbolAbi,
  tokenNameAbi,
  tokenBalanceAbi,
  tokenDecimalsAbi
)

export const ETHER_TOKEN_FAKE_ADDRESS =
  '0x0000000000000000000000000000000000000000'

// "Important" tokens the Finance app should prioritize
const PRESET_TOKENS = new Map([
  [
    'main',
    [
      ETHER_TOKEN_FAKE_ADDRESS,
      ANT_MAINNET_TOKEN_ADDRESS,
      SAI_MAINNET_TOKEN_ADDRESS,
    ],
  ],
])

// Some known tokens don’t strictly follow ERC-20 and it would be difficult to
// adapt to every situation. The data listed in this map is used as a fallback
// if either some part of their interface doesn't conform to a standard we
// support.
const KNOWN_TOKENS_OVERRIDE = new Map([
  [
    'main',
    new Map([
      [
        SAI_MAINNET_TOKEN_ADDRESS,
        { symbol: 'SAI', name: 'Sai Stablecoin v1.0', decimals: '18' },
      ],
    ]),
  ]
])

export const isTokenVerified = (tokenAddress, networkType) =>
  // The verified list is without checksums
  networkType === 'main'
    ? ETHER_TOKEN_VERIFIED_ADDRESSES.has(tokenAddress.toLowerCase())
    : true

export const tokenDataOverride = (tokenAddress, fieldName, networkType) => {
  // The override list is without checksums
  const addressWithoutChecksum = tokenAddress.toLowerCase()

  const overridesForNetwork = KNOWN_TOKENS_OVERRIDE.get(networkType)
  if (
    overridesForNetwork == null ||
    !overridesForNetwork.has(addressWithoutChecksum)
  ) {
    return null
  }
  return overridesForNetwork.get(addressWithoutChecksum)[fieldName] || null
}

export async function getTokenSymbol(app, address) {
  // Symbol is optional; note that aragon.js doesn't return an error (only an falsey value) when
  // getting this value fails
  let tokenSymbol
  try {
    const token = app.external(address, tokenSymbolAbi)
    tokenSymbol = await token.symbol().toPromise()
  } catch (err) {
    // Some tokens (e.g. DS-Token) use bytes32 as the return type for symbol().
    const token = app.external(address, tokenSymbolBytesAbi)
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
  try {
    const token = app.external(address, tokenDecimalsAbi)
    return await token.decimals().toPromise()
  }
  catch (err) {
    const token = app.external(address, tokenDecimals256Abi)
    return await token.decimals().toPromise()
  }

}

export function getPresetTokens(networkType) {
  return PRESET_TOKENS.get(networkType) || [ETHER_TOKEN_FAKE_ADDRESS]
}
