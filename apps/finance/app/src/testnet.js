import testTokens from '@aragon/templates-tokens'

export const getTestTokenAddresses = (network = 'rinkeby') =>
  (testTokens[network] && testTokens[network].tokens) || []
