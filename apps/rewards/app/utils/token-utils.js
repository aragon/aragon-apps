import { ETHER_TOKEN_VERIFIED_ADDRESSES } from '../../../../shared/lib/verified-tokens'
import { toUtf8 } from './web3-utils'
import tokenSymbolAbi from '../../../../shared/abi/token-symbol.json'
import tokenSymbolBytesAbi from '../../../../shared/abi/token-symbol-bytes.json'
import tokenNameAbi from '../../../../shared/abi/token-name.json'
import tokenNameBytesAbi from '../../../../shared/abi/token-name-bytes.json'
import tokenCreationBlockAbi from '../../../../shared/abi/token-creationblock.json'
import tokenTransferAbi from '../../../../shared/abi/token-transferable.json'

export const SAI_MAINNET_TOKEN_ADDRESS = '0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359'
export const ETHER_TOKEN_FAKE_ADDRESS = '0x0000000000000000000000000000000000000000'

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

export const tokenDataFallback = (tokenAddress, fieldName, networkType) => {
  // The fallback list is without checksums
  const addressWithoutChecksum = tokenAddress.toLowerCase()

  const fallbacksForNetwork = KNOWN_TOKENS_OVERRIDE.get(networkType)
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

export async function getTokenStartBlock(app, address) {
  // creation block is optional; It's only available for MiniMe Tokens
  let token = app.external(address, tokenCreationBlockAbi)
  let tokenStartBlock
  try {
    tokenStartBlock = await token.creationBlock().toPromise()
  }
  catch(e) {
    tokenStartBlock = null
  }
  return tokenStartBlock
}

export async function getTokenCreationDate(app, address) {
  // creation Date is optional; It's only available for MiniMe Tokens
  const token = app.external(address, tokenCreationBlockAbi)
  try {
    const creationBlockNumber = await token.creationBlock().toPromise()
    const creationBlock = await app.web3Eth('getBlock', creationBlockNumber)
      .toPromise()
    const creationDate = new Date(creationBlock.timestamp * 1000)
    return creationDate
  }
  catch (e) {
    return new Date(0)
  }
}

export async function getTransferable(app, address) {
  // creation block is optional; It's only available for MiniMe Tokens
  let token = app.external(address, tokenTransferAbi)
  let transferable
  try {
    transferable = await token.transfersEnabled().toPromise()
  }
  catch (e) {
    transferable = null
  }
  return transferable
}
