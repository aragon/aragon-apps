import { ETHER_TOKEN_VERIFIED_LIST } from './verified-tokens'

export const ETHER_TOKEN_FAKE_ADDRESS =
  '0x0000000000000000000000000000000000000000'

export const isTokenVerified = (tokenAddress, networkType) =>
  networkType === 'mainnet' ? ETHER_TOKEN_VERIFIED_LIST.has(tokenAddress) : true
