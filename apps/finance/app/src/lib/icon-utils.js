import { tokenIconUrl as _tokenIconUrl } from '@aragon/ui'
import { getTestTokenAddresses } from '../testnet'
import { ETHER_TOKEN_FAKE_ADDRESS } from './token-utils'
import { ETHER_TOKEN_VERIFIED_BY_SYMBOL } from './verified-tokens'

// Small shim on top of @aragon/ui's tokenIconUrl, to handle our testnet tokens
export const tokenIconUrl = (tokenAddress, tokenSymbol, networkType) => {
  if (tokenAddress === ETHER_TOKEN_FAKE_ADDRESS || networkType === 'main') {
    return _tokenIconUrl(tokenAddress)
  }

  // On other networks, only pretend known test tokens are legit
  const testTokens = new Set(getTestTokenAddresses(networkType))
  if (testTokens.has(tokenAddress.toLowerCase())) {
    // For the memez
    if (tokenSymbol === 'BCC') {
      return 'https://chasing-coins.com/coin/logo/BCC'
    }

    const mainnetEquivalent = ETHER_TOKEN_VERIFIED_BY_SYMBOL.get(tokenSymbol)
    return mainnetEquivalent ? _tokenIconUrl(mainnetEquivalent) : ''
  }

  return ''
}
