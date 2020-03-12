import abi from 'web3-eth-abi'

import { ETHER_TOKEN_VERIFIED_ADDRESSES } from './verified-tokens'
import { toUtf8 } from './web3-utils'
import tokenNameAbi from '../abi/token-name.json'
import tokenNameBytesAbi from '../abi/token-name-bytes.json'
import tokenSymbolAbi from '../abi/token-symbol.json'
import tokenSymbolBytesAbi from '../abi/token-symbol-bytes.json'
import tokenTransferEventAbi from '../abi/token-transfer-event.json'

const TOKEN_TRANSFER_EVENT_INPUTS = tokenTransferEventAbi[0].inputs
const TOKEN_TRANSFER_EVENT_SIGNATURE = abi.encodeEventSignature(
  tokenTransferEventAbi[0]
)

const ANJ_MAINNET_TOKEN_ADDRESS = '0xcD62b1C403fa761BAadFC74C525ce2B51780b184'
const ANT_MAINNET_TOKEN_ADDRESS = '0x960b236A07cf122663c4303350609A66A7B288C0'
const DAI_MAINNET_TOKEN_ADDRESS = '0x6B175474E89094C44Da98b954EedeAC495271d0F'
const SAI_MAINNET_TOKEN_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359'
const USDC_MAINNET_TOKEN_ADDRESS = '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48'
const USDT_MAINNET_TOKEN_ADDRESS = '0xdac17f958d2ee523a2206206994597c13d831ec7'
export const ETHER_TOKEN_FAKE_ADDRESS =
  '0x0000000000000000000000000000000000000000'

// "Important" tokens the Agent app should prioritize experience for
const PRESET_TOKENS = new Map([
  [
    'main',
    [
      ETHER_TOKEN_FAKE_ADDRESS,
      ANJ_MAINNET_TOKEN_ADDRESS,
      ANT_MAINNET_TOKEN_ADDRESS,
      DAI_MAINNET_TOKEN_ADDRESS,
      SAI_MAINNET_TOKEN_ADDRESS,
      USDC_MAINNET_TOKEN_ADDRESS,
      USDT_MAINNET_TOKEN_ADDRESS,
    ],
  ],
])

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

export function isTokenVerified(tokenAddress, networkType) {
  // The verified list is without checksums
  return networkType === 'main'
    ? ETHER_TOKEN_VERIFIED_ADDRESSES.has(tokenAddress.toLowerCase())
    : true
}
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

export function getPresetTokens(networkType) {
  return PRESET_TOKENS.get(networkType) || [ETHER_TOKEN_FAKE_ADDRESS]
}

export function findTransfersFromReceipt(receipt) {
  const { logs = [] } = receipt
  const transferLogs = logs.filter(
    ({ topics = [] }) => topics[0] === TOKEN_TRANSFER_EVENT_SIGNATURE
  )
  return transferLogs
    .map(({ address, data, topics }) => {
      try {
        return {
          token: address,
          returnData: abi.decodeLog(TOKEN_TRANSFER_EVENT_INPUTS, data, topics),
        }
      } catch (_) {
        return null
      }
    })
    .filter(Boolean)
}
