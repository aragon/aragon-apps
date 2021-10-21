import {
  ETHER_TOKEN_FAKE_ADDRESS,
  getPresetTokens,
  getTokenDecimals,
  getTokenSymbol,
  getTokenName,
  isTokenVerified,
  tokenAbi,
  tokenDataOverride,
} from '../lib/token-utils'
import {addressesEqual} from '../lib/web3-utils'
import {app} from '.'

export const getEthToken = () => ({address: ETHER_TOKEN_FAKE_ADDRESS})

const tokenContracts = new Map() // Addr -> External contract
const tokenDecimals = new Map() // External contract -> decimals
const tokenNames = new Map() // External contract -> name
const tokenSymbols = new Map() // External contract -> symbol

export const initEthToken = () => {
  // Set up ETH placeholders
  const ETH_CONTRACT = Symbol('ETH_CONTRACT')
  tokenContracts.set(ETHER_TOKEN_FAKE_ADDRESS, ETH_CONTRACT)
  tokenDecimals.set(ETH_CONTRACT, '18')
  tokenNames.set(ETH_CONTRACT, 'Ether')
  tokenSymbols.set(ETH_CONTRACT, 'ETH')
}

export const initializeTokens = async (cachedState = {}, settings) => {
  
  initEthToken()
  const newState = {
    ...cachedState,
    isSyncing: true,
    // TODO:  failing on getting periodDuration (should be public or have a getter in the contract)
    // periodDuration: marshallDate(await app.call('periodDuration').toPromise()),
    vaultAddress: settings.vault.address,
  }

  return await loadTokenBalances(
    newState,
    getPresetTokens(settings.network.type), // always immediately load some tokens
    settings
  )
}

const loadTokenBalances = async (state, includedTokenAddresses, settings) => {
  let newState = {
    ...state,
  }
  
  if (
    !Array.isArray(newState.balances) &&
    !Array.isArray(includedTokenAddresses)
  ) {
    return newState
  }

  let newBalances = newState.balances || []
  const addresses = new Set(
    newBalances.map(({address}) => address).concat(includedTokenAddresses || [])
  )
  for (const address of addresses) {
    newBalances = await updateBalances(newBalances, address, settings)
  }

  return {
    ...newState,
    balances: newBalances,
  }
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

export const updateBalances = async (balances, tokenAddress, settings) => {
  const newBalances = Array.from(balances || [])

  const tokenContract = tokenContracts.has(tokenAddress)
    ? tokenContracts.get(tokenAddress)
    : app.external(tokenAddress, tokenAbi)
  tokenContracts.set(tokenAddress, tokenContract)

  const balancesIndex = newBalances.findIndex(({address}) =>
    addressesEqual(address, tokenAddress)
  )
  if (balancesIndex === -1) {
    return newBalances.concat(
      await newBalanceEntry(tokenContract, tokenAddress, settings)
    )
  } else {
    newBalances[balancesIndex] = {
      ...newBalances[balancesIndex],
      amount: await loadTokenBalance(tokenAddress, settings),
    }
    return newBalances
  }
}

const newBalanceEntry = async (tokenContract, tokenAddress, settings) => {
  const [balance, decimals, name, symbol] = await Promise.all([
    loadTokenBalance(tokenAddress, settings),
    loadTokenDecimals(tokenContract, tokenAddress, settings),
    loadTokenName(tokenContract, tokenAddress, settings),
    loadTokenSymbol(tokenContract, tokenAddress, settings),
  ])

  return {
    decimals,
    name,
    symbol,
    address: tokenAddress,
    amount: balance,
    verified:
      isTokenVerified(tokenAddress, settings.network.type) ||
      addressesEqual(tokenAddress, settings.ethToken.address),
  }
}

const loadTokenBalance = (tokenAddress, {vault}) =>
  vault.contract.balance(tokenAddress).toPromise()

export const loadTokenDecimals = async (tokenContract, tokenAddress, {network}) => {
  if (tokenDecimals.has(tokenContract)) {
    return tokenDecimals.get(tokenContract)
  }

  const override =
    tokenDataOverride(tokenAddress, 'decimals', network.type)

  let decimals
  try {
    decimals = override || (await getTokenDecimals(app, tokenAddress))
    tokenDecimals.set(tokenContract, decimals)
  } catch (err) {
    // decimals is optional
    decimals = '0'
  }
  return decimals
}

const loadTokenName = async (tokenContract, tokenAddress, {network}) => {
  if (tokenNames.has(tokenContract)) {
    return tokenNames.get(tokenContract)
  }
  const override = tokenDataOverride(tokenAddress, 'name', network.type)

  let name
  try {
    name = override || (await getTokenName(app, tokenAddress))
    tokenNames.set(tokenContract, name)
  } catch (err) {
    // name is optional
    name = ''
  }
  return name
}

// exported for Dot Voting
export const loadTokenSymbol = async (tokenContract, tokenAddress, {network}) => {
  if (tokenSymbols.has(tokenContract)) {
    return tokenSymbols.get(tokenContract)
  }
  const override = tokenDataOverride(tokenAddress, 'symbol', network.type)

  let symbol
  try {
    symbol = override || (await getTokenSymbol(app, tokenAddress))
    tokenSymbols.set(tokenContract, symbol)
  } catch (err) {
    // symbol is optional
    symbol = ''
  }
  return symbol
}

// Represent dates as real numbers, as it's very unlikely they'll hit the limit...
// Adjust for js time (in ms vs s)
const marshallDate = date => parseInt(date, 10) * 1000
