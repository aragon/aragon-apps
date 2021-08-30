import Aragon, { events } from '@aragon/api'
import { first } from 'rxjs/operators'
import { getTestTokenAddresses } from './testnet'
import * as transactionTypes from './transaction-types'
import {
  ETHER_TOKEN_FAKE_ADDRESS,
  findTransfersFromReceipt,
  getPresetTokens,
  getTokenSymbol,
  getTokenName,
  isTokenVerified,
  tokenDataFallback,
} from './lib/token-utils'
import { addressesEqual } from './lib/web3-utils'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenNameAbi from './abi/token-name.json'
import tokenSymbolAbi from './abi/token-symbol.json'

const tokenAbi = [].concat(tokenDecimalsAbi, tokenNameAbi, tokenSymbolAbi)

const TEST_TOKEN_ADDRESSES = []
const tokenContracts = new Map() // Addr -> External contract
const tokenDecimals = new Map() // External contract -> decimals
const tokenNames = new Map() // External contract -> name
const tokenSymbols = new Map() // External contract -> symbol

const ETH_CONTRACT = Symbol('ETH_CONTRACT')

const app = new Aragon()

/*
 * Calls `callback` exponentially, everytime `retry()` is called.
 * Returns a promise that resolves with the callback's result if it (eventually) succeeds.
 *
 * Usage:
 *
 * retryEvery(retry => {
 *  // do something
 *
 *  if (condition) {
 *    // retry in 1, 2, 4, 8 seconds… as long as the condition passes.
 *    retry()
 *  }
 * }, 1000, 2)
 *
 */
const retryEvery = async (
  callback,
  { initialRetryTimer = 1000, increaseFactor = 3, maxRetries = 3 } = {}
) => {
  const sleep = time => new Promise(resolve => setTimeout(resolve, time))

  let retryNum = 0
  const attempt = async (retryTimer = initialRetryTimer) => {
    try {
      return await callback()
    } catch (err) {
      if (retryNum === maxRetries) {
        throw err
      }
      ++retryNum

      // Exponentially backoff attempts
      const nextRetryTime = retryTimer * increaseFactor
      console.log(
        `Retrying in ${nextRetryTime}s... (attempt ${retryNum} of ${maxRetries})`
      )
      await sleep(nextRetryTime)
      return attempt(nextRetryTime)
    }
  }

  return attempt()
}

retryEvery(() =>
  // There are no settings to check, so we do a throwaway check to `initialized()`
  // just to make sure we can connect properly
  app
    .call('hasInitialized')
    .toPromise()
    .then(() => initialize())
).catch(_ => {
  throw new Error(
    'Could not start background script execution due to the contract not being connected to a network'
  )
})

async function initialize() {
  const network = await app
    .network()
    .pipe(first())
    .toPromise()
  TEST_TOKEN_ADDRESSES.push(...getTestTokenAddresses(network.type))
  // Fetch proxy address to add it to settings
  const currentApp = await app.currentApp().toPromise()
  const proxyAddress = currentApp.appAddress
  // Set up ETH placeholders
  const ethAddress = ETHER_TOKEN_FAKE_ADDRESS

  // Set up ETH plsaceholders
  tokenContracts.set(ethAddress, ETH_CONTRACT)
  tokenDecimals.set(ETH_CONTRACT, network?.nativeCurrency?.decimals || '18')
  tokenNames.set(ETH_CONTRACT, network?.nativeCurrency?.name || 'Ether 123')
  tokenSymbols.set(ETH_CONTRACT, network?.nativeCurrency?.symbol || 'Eth 123')

  const settings = {
    network,
    ethToken: {
      address: ethAddress,
    },
    proxyAddress,
  }

  return app.store(
    async (state, event) => {
      const { event: eventName } = event
      const nextState = {
        ...state,
        proxyAddress,
      }

      if (eventName === events.SYNC_STATUS_SYNCING) {
        return { ...nextState, isSyncing: true }
      } else if (eventName === events.SYNC_STATUS_SYNCED) {
        return { ...nextState, isSyncing: false }
      }

      switch (eventName) {
        // AppProxy events
        case 'ProxyDeposit':
          return newProxyDeposit(nextState, event, settings)
        // Vault events
        case 'VaultTransfer':
        case 'VaultDeposit':
          return newVaultTransaction(nextState, event, settings)
        // Agent events
        case 'SafeExecute':
        case 'Execute':
          return newExecution(nextState, event, settings)
        default:
          return nextState
      }
    },
    {
      init: initializeState(settings),
    }
  )
}

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

const initializeState = settings => async cachedState => {
  const newState = {
    ...cachedState,
    isSyncing: true,
  }
  const withTokenBalances = await loadTokenBalances(
    newState,
    getPresetTokens(settings.network.type), // always immediately load some tokens
    settings
  )
  const withTestnetState = await loadTestnetTokenBalances(
    withTokenBalances,
    settings
  )

  return withTestnetState
}

async function newProxyDeposit(state, event, settings) {
  const { sender, value } = event.returnValues
  const newBalances = await updateBalances(
    state.balances,
    settings.ethToken.address,
    settings
  )
  const newTransactions = await updateTransactions(state.transactions, event, {
    description: 'Direct deposit',
    tokenTransfers: [
      {
        amount: value,
        from: sender,
        to: null,
        token: settings.ethToken.address,
      },
    ],
  })

  return {
    ...state,
    balances: newBalances,
    transactions: newTransactions,
  }
}

async function newVaultTransaction(state, event, settings) {
  const {
    event: eventName,
    returnValues: { amount, token },
  } = event

  const transactionDetailOptions =
    eventName === 'VaultDeposit'
      ? {
          description: 'Direct deposit',
          tokenTransfers: [
            {
              amount,
              token,
              from: event.returnValues.sender,
              to: null,
            },
          ],
        }
      : eventName === 'VaultTransfer'
      ? {
          description: 'Direct transfer',
          tokenTransfers: [
            {
              amount,
              token,
              from: null,
              to: event.returnValues.to,
            },
          ],
        }
      : null

  const newBalances = await updateBalances(state.balances, token, settings)
  const newTransactions = transactionDetailOptions
    ? await updateTransactions(
        state.transactions,
        event,
        transactionDetailOptions
      )
    : state.transactions

  return {
    ...state,
    balances: newBalances,
    transactions: newTransactions,
  }
}

async function newExecution(state, event, settings) {
  const {
    transactionHash,
    returnValues: { ethValue, target },
  } = event
  // Let's try to find some more information about this particular execution
  // by using the transaction receipt:
  //   - To address
  //   - Any internal token transfers to / from this agent app
  const transactionReceipt = await app
    .web3Eth('getTransactionReceipt', transactionHash)
    .toPromise()
  const ethTransfers = []
  if (ethValue && ethValue !== '0') {
    ethTransfers.push({
      amount: ethValue,
      from: null,
      to: transactionReceipt.to,
      token: settings.ethToken.address,
    })
  }

  const transfersFromReceipts = findTransfersFromReceipt(transactionReceipt)
    .map(({ token, returnData }) => {
      const { from, to, value } = returnData
      const fromAgent = addressesEqual(
        from.toLowerCase(),
        settings.proxyAddress
      )
      const toAgent = addressesEqual(to.toLowerCase(), settings.proxyAddress)
      // Filter out token transfers not to the agent
      return fromAgent || toAgent
        ? {
            token,
            amount: value,
            from: fromAgent ? null : from,
            to: toAgent ? null : to,
          }
        : null
    })
    .filter(Boolean)

  const tokenTransfers = [...ethTransfers, ...transfersFromReceipts]
  // Also try to find the target contract for contract interactions,
  // which do not necessarily have token transfers
  let newBalances = state.balances
  const updatedTokenAddresses = tokenTransfers.map(({ token }) => token)
  for (const address of updatedTokenAddresses) {
    newBalances = await updateBalances(newBalances, address, settings)
  }

  const newTransactions = await updateTransactions(state.transactions, event, {
    // TODO: fetch description via radspec / on-chain registry fallback
    // (see https://metamask.github.io/metamask-docs/Best_Practices/Registering_Function_Names)
    description: 'Contract interaction',
    tokenTransfers,
    targetContract: target,
  })
  return {
    ...state,
    balances: newBalances,
    transactions: newTransactions,
  }
}

/***********************
 *                     *
 *    Token Helpers    *
 *                     *
 ***********************/

async function loadTokenBalances(state, includedTokenAddresses, settings) {
  const newState = {
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
    newBalances
      .map(({ address }) => address)
      .concat(includedTokenAddresses || [])
  )
  for (const address of addresses) {
    newBalances = await updateBalances(newBalances, address, settings)
  }

  return {
    ...newState,
    balances: newBalances,
  }
}

async function updateBalances(balances, tokenAddress, settings) {
  const newBalances = Array.from(balances || [])

  const tokenContract = tokenContracts.has(tokenAddress)
    ? tokenContracts.get(tokenAddress)
    : app.external(tokenAddress, tokenAbi)
  tokenContracts.set(tokenAddress, tokenContract)

  const balancesIndex = newBalances.findIndex(({ address }) =>
    addressesEqual(address, tokenAddress)
  )

  if (balancesIndex === -1) {
    return newBalances.concat(
      await newBalanceEntry(tokenContract, tokenAddress, settings)
    )
  } else {
    newBalances[balancesIndex] = {
      ...newBalances[balancesIndex],
      amount: await loadTokenBalance(tokenAddress),
    }
    return newBalances
  }
}

async function newBalanceEntry(tokenContract, tokenAddress, settings) {
  const [balance, decimals, name, symbol] = await Promise.all([
    loadTokenBalance(tokenAddress),
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

function loadTokenBalance(tokenAddress) {
  return app.call('balance', tokenAddress).toPromise()
}

async function loadTokenDecimals(tokenContract, tokenAddress, { network }) {
  if (tokenDecimals.has(tokenContract)) {
    return tokenDecimals.get(tokenContract)
  }

  const fallback =
    tokenDataFallback(tokenAddress, 'decimals', network.type) || '0'

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

/***********************
 *                     *
 * Transaction Helpers *
 *                     *
 ***********************/

async function updateTransactions(transactions, event, detailOptions) {
  const newTransactions = Array.from(transactions || [])

  const transactionDetails = await marshallTransactionDetails(
    event,
    detailOptions
  )

  const transactionsIndex = newTransactions.findIndex(
    ({ id }) => id === transactionDetails.id
  )
  if (transactionsIndex === -1) {
    return newTransactions.concat(transactionDetails)
  } else {
    newTransactions[transactionsIndex] = transactionDetails
    return newTransactions
  }
}

async function marshallTransactionDetails(
  event,
  { tokenTransfers = [], description = '', targetContract = null } = {}
) {
  const {
    blockNumber,
    logIndex,
    transactionHash,
    transactionIndex,
    event: eventName,
  } = event

  // There's no unique identifier for Vault / Agent events, so we use the event's
  // unique location in a transaction hash
  // There's a possibility that this could change in the case of a chain re-org,
  // but this is more theoretical than real
  const transactionId = `${transactionHash}.${transactionIndex}.${logIndex}`
  const date = await loadBlockTime(blockNumber)
  const type =
    eventName === 'VaultDeposit'
      ? transactionTypes.Deposit
      : eventName === 'VaultTransfer'
      ? transactionTypes.Transfer
      : eventName === 'Execute' || eventName === 'SafeExecute'
      ? transactionTypes.Execution
      : transactionTypes.Unknown
  const safe = eventName === 'SafeExecute'

  return {
    date,
    description,
    safe,
    targetContract,
    tokenTransfers,
    transactionHash,
    type,
    id: transactionId,
  }
}

async function loadBlockTime(blockNumber) {
  const { timestamp } = await app.web3Eth('getBlock', blockNumber).toPromise()
  // Adjust for solidity time (s => ms)
  return timestamp * 1000
}

/**********************
 *                    *
 * RINKEBY TEST STATE *
 *                    *
 **********************/

async function loadTestnetTokenBalances(state, settings) {
  let newBalances = state.balances
  for (const tokenAddress of TEST_TOKEN_ADDRESSES) {
    newBalances = await updateBalances(newBalances, tokenAddress, settings)
  }

  return {
    ...state,
    balances: newBalances,
  }
}
