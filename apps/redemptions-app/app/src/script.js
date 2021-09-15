import 'core-js/stable'
import 'regenerator-runtime/runtime'
import { first } from 'rxjs/operators'
import { forkJoin } from 'rxjs'
import Aragon, { events } from '@aragon/api'

import {
  ETHER_TOKEN_FAKE_ADDRESS,
  isTokenVerified,
  tokenDataFallback,
  getTokenSymbol,
  getTokenName,
} from './lib/token-utils'
import { addressesEqual } from './lib/web3-utils'
import retryEvery from './lib/retry-every'

import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenNameAbi from './abi/token-name.json'
import tokenSymbolAbi from './abi/token-symbol.json'
import tokenSupplyAbi from './abi/token-totalSupply.json'

import minimeTokenAbi from './abi/minimeToken.json'
import tokenManagerAbi from './abi/tokenManager.json'
import vaultAbi from './abi/vault.json'

const tokenAbi = [].concat(tokenDecimalsAbi, tokenNameAbi, tokenSymbolAbi, tokenSupplyAbi)
const ZERO_ADDRESS = ETHER_TOKEN_FAKE_ADDRESS

const tokenContracts = new Map() // Addr -> External contract
const tokenDecimals = new Map() // External contract -> decimals
const tokenNames = new Map() // External contract -> name
const tokenSymbols = new Map() // External contract -> symbol

const ETH_CONTRACT = Symbol('ETH_CONTRACT')

const app = new Aragon()

retryEvery(() => {
  forkJoin(app.call('vault'), app.call('tokenManager')).subscribe(
    adresses => initialize(...adresses, ETHER_TOKEN_FAKE_ADDRESS),
    err =>
      console.error(
        `Could not start background script execution due to the contract not loading vault or tokenManager: ${err}`
      )
  )
})

async function initialize(vaultAddress, tokenManagerAddress, ethAddress) {
  const vaultContract = app.external(vaultAddress, vaultAbi)
  const tokenManagerContract = app.external(tokenManagerAddress, tokenManagerAbi)

  const minimeAddress = await tokenManagerContract.token().toPromise()
  const minimeContract = app.external(minimeAddress, minimeTokenAbi)

  const minimeData = await getMinimeTokenData(minimeContract)
  app.identify(minimeData.symbol)

  const network = await app
    .network()
    .pipe(first())
    .toPromise()

  // Set up ETH placeholders
  tokenContracts.set(ethAddress, ETH_CONTRACT)
  tokenDecimals.set(ETH_CONTRACT, '18')
  tokenNames.set(ETH_CONTRACT, 'Ether')
  tokenSymbols.set(ETH_CONTRACT, 'ETH')

  return createStore({
    network,
    ethToken: {
      address: ethAddress,
    },
    vault: {
      address: vaultAddress,
      contract: vaultContract,
    },
    tokenManager: {
      address: tokenManagerAddress,
      contract: tokenManagerContract,
    },
    minimeToken: {
      address: minimeAddress,
      contract: minimeContract,
      data: minimeData,
    },
  })
}

async function createStore(settings) {
  let vaultInitializationBlock

  try {
    vaultInitializationBlock = await settings.vault.contract.getInitializationBlock().toPromise()
  } catch (err) {
    console.error("Could not get attached vault's initialization block:", err)
  }

  const currentBlock = await getBlockNumber()

  const storeOptions = {
    init: initializeState(settings),
    externals: [
      {
        contract: settings.vault.contract,
        initializationBlock: vaultInitializationBlock,
      },
      {
        contract: settings.minimeToken.contract,
      },
    ],
  }

  return app.store((state, { event, address, returnValues, blockNumber }) => {
    const { vault, minimeToken } = settings

    // Dont want to listen for past events for now
    // (our app state can be obtained from smart contract state)
    if (blockNumber && blockNumber <= currentBlock) return state

    const nextState = {
      ...state,
    }

    // default events
    switch (event) {
      case events.ACCOUNTS_TRIGGER:
        return updateConnectedAccount(nextState, returnValues, settings)
      case events.SYNC_STATUS_SYNCING:
        return { ...nextState, isSyncing: true }
      case events.SYNC_STATUS_SYNCED:
        return { ...nextState, isSyncing: false }
    }

    if (addressesEqual(address, vault.address)) {
      // Vault event
      return vaultEvent(nextState, returnValues, settings)
    } else if (addressesEqual(address, minimeToken.address)) {
      // minimeTokenEvent
      return minimeTokenEvent(nextState, returnValues, settings)
    } else {
      // Redemptions event
      switch (event) {
        case 'AddRedeemableToken':
          return addedToken(nextState, returnValues, settings)
        case 'RemoveRedeemableToken':
          return removedToken(nextState, returnValues)
        case 'Redeem':
          return newRedemption(nextState, settings)
        default:
          return state
      }
    }
  }, storeOptions)
}

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

function initializeState(settings) {
  return async cachedState => {
    try {
      const nextState = {
        ...cachedState,
        isSyncing: true,
        burnableToken: {
          ...settings.minimeToken.data,
          totalSupply: await getMinimeTokenTotalSupply(settings),
        },
        tokens: await updateTokens(settings),
      }

      return nextState
    } catch (err) {
      console.error('Error initializing state: ', err)
    }
  }
}

async function updateConnectedAccount(state, { account }, settings) {
  const { burnableToken } = state
  return {
    ...state,
    burnableToken: {
      ...burnableToken,
      balance: account ? await spendableBalanceOf(settings, account) : 0,
    },
    account,
  }
}

// Called when token is withdrawn from or deposited to the vault
async function vaultEvent(state, { token }, settings) {
  const { tokens } = state
  const index = tokens.findIndex(t => addressesEqual(t.address, token))

  if (index < 0) return state

  const elem = {
    ...tokens[index],
    amount: await loadTokenBalance(token, settings),
  }

  const newTokens = [...tokens.slice(0, index), elem, ...tokens.slice(index + 1)]
  return {
    ...state,
    tokens: newTokens,
  }
}

// Called when minimeToken balance has increased/decreased or has been transfered between accounts
async function minimeTokenEvent(state, { _from, _to }, settings) {
  const { burnableToken, account } = state
  const newBurnableToken = { ...burnableToken }

  // Tokens minted or burned
  if (addressesEqual(_from, ZERO_ADDRESS) || addressesEqual(_to, ZERO_ADDRESS))
    newBurnableToken.totalSupply = await getMinimeTokenTotalSupply(settings)

  // Transfered from/to connected account
  if (addressesEqual(_from, account) || addressesEqual(_to, account))
    newBurnableToken.balance = await spendableBalanceOf(settings, account)

  return {
    ...state,
    burnableToken: newBurnableToken,
  }
}

// New token has been added to redemptions list
async function addedToken(state, { token }, settings) {
  // fix to address issue where contract events randomly fire twice
  const index = state.tokens.findIndex(t => addressesEqual(t.address, token))
  if (index > -1) return state

  return {
    ...state,
    tokens: [...state.tokens, ...(await getVaultBalances([token], settings))],
  }
}

// Token has been removed from redemptions list
async function removedToken(state, { token }) {
  const { tokens } = state

  const nextState = {
    ...state,
  }

  const index = tokens.findIndex(t => addressesEqual(t.address, token))

  if (index > -1) {
    tokens.splice(index, 1)
    nextState.tokens = [...tokens]
  }

  return nextState
}

// New redemption has been made
async function newRedemption(state, settings) {
  return {
    ...state,
    tokens: await updateTokens(settings),
  }
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

// Returns burnable token metadata
async function getMinimeTokenData(minimeContract) {
  const [symbol, decimals] = await Promise.all([
    minimeContract.symbol().toPromise(),
    minimeContract.decimals().toPromise(),
  ])
  return {
    symbol,
    decimals,
  }
}

function getMinimeTokenTotalSupply({ minimeToken: { contract } }) {
  return contract.totalSupply().toPromise()
}

function spendableBalanceOf({ tokenManager: { contract } }, account) {
  return contract.spendableBalanceOf(account).toPromise()
}

// Called when redemption has been made (refresh of all redeemable tokens balance)
async function updateTokens(settings) {
  const tokens = await app.call('getRedeemableTokens').toPromise()
  return getVaultBalances(tokens, settings)
}

// Returns `tokens` balances from vault
async function getVaultBalances(tokens = [], settings) {
  let balances = []
  for (const tokenAddress of tokens) {
    const tokenContract = tokenContracts.has(tokenAddress)
      ? tokenContracts.get(tokenAddress)
      : app.external(tokenAddress, tokenAbi)
    tokenContracts.set(tokenAddress, tokenContract)
    balances = [...balances, await newBalanceEntry(tokenContract, tokenAddress, settings)]
  }
  return balances
}

async function newBalanceEntry(tokenContract, tokenAddress, settings) {
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

function loadTokenBalance(tokenAddress, { vault }) {
  return vault.contract.balance(tokenAddress).toPromise()
}

async function loadTokenDecimals(tokenContract, tokenAddress, { network }) {
  if (tokenDecimals.has(tokenContract)) {
    return tokenDecimals.get(tokenContract)
  }

  const fallback = tokenDataFallback(tokenAddress, 'decimals', network.type) || '0'

  let decimals
  try {
    decimals = (await tokenContract.decimals().toPromise()) || fallback
    tokenDecimals.set(tokenContract, decimals)
  } catch (err) {
    // decimals is optional
    decimals = fallback
  }
  return decimals
}

async function loadTokenName(tokenContract, tokenAddress, { network }) {
  if (tokenNames.has(tokenContract)) {
    return tokenNames.get(tokenContract)
  }
  const fallback = tokenDataFallback(tokenAddress, 'name', network.type) || ''

  let name
  try {
    name = (await getTokenName(app, tokenAddress)) || fallback
    tokenNames.set(tokenContract, name)
  } catch (err) {
    // name is optional
    name = fallback
  }
  return name
}

async function loadTokenSymbol(tokenContract, tokenAddress, { network }) {
  if (tokenSymbols.has(tokenContract)) {
    return tokenSymbols.get(tokenContract)
  }
  const fallback = tokenDataFallback(tokenAddress, 'symbol', network.type) || ''

  let symbol
  try {
    symbol = (await getTokenSymbol(app, tokenAddress)) || fallback
    tokenSymbols.set(tokenContract, symbol)
  } catch (err) {
    // symbol is optional
    symbol = fallback
  }
  return symbol
}

function getBlockNumber() {
  return new Promise((resolve, reject) => app.web3Eth('getBlockNumber').subscribe(resolve, reject))
}
