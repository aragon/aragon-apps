import { tokenIconUrl as _tokenIconUrl } from '@aragon/ui'
import { ETHER_TOKEN_VERIFIED_BY_SYMBOL } from './verified-tokens'

// Small shim on top of @aragon/ui's tokenIconUrl, to handle our testnet tokens
export const tokenIconUrl = (tokenAddress, tokenSymbol, networkType) => {
  if (networkType === 'main') {
    return _tokenIconUrl(tokenAddress)
  }

  // On other networks, pretend any token with the same symbol is legit
  const mainnetEquivalent = ETHER_TOKEN_VERIFIED_BY_SYMBOL.get(tokenSymbol)
  return mainnetEquivalent ? _tokenIconUrl(mainnetEquivalent) : ''
}
