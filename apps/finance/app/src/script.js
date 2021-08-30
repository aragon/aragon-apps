import Aragon, { events } from '@aragon/api'
import { first } from 'rxjs/operators'
import { getTestTokenAddresses } from './testnet'
import {
  ETHER_TOKEN_FAKE_ADDRESS,
  getPresetTokens,
  getTokenSymbol,
  getTokenName,
  isTokenVerified,
  tokenDataOverride,
} from './lib/token-utils'
import { addressesEqual } from './lib/web3-utils'
import tokenBalanceOfAbi from './abi/token-balanceof.json'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenNameAbi from './abi/token-name.json'
import tokenSymbolAbi from './abi/token-symbol.json'
import vaultBalanceAbi from './abi/vault-balance.json'
import vaultGetInitializationBlockAbi from './abi/vault-getinitializationblock.json'
import vaultEventAbi from './abi/vault-events.json'

const tokenAbi = [].concat(
  tokenBalanceOfAbi,
  tokenDecimalsAbi,
  tokenNameAbi,
  tokenSymbolAbi
)
const vaultAbi = [].concat(
  vaultBalanceAbi,
  vaultGetInitializationBlockAbi,
  vaultEventAbi
)

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

// Get the vault address to initialize ourselves
retryEvery(() =>
  app
    .call('vault')
    .toPromise()
    .then(vaultAddress => initialize(vaultAddress, ETHER_TOKEN_FAKE_ADDRESS))
    .catch(err => {
      console.error(
        'Could not start background script execution due to the contract not loading the vault:',
        err
      )
      throw err
    })
)

async function initialize(vaultAddress, ethAddress) {
  const vaultContract = app.external(vaultAddress, vaultAbi)

  const network = await app
    .network()
    .pipe(first())
    .toPromise()

  TEST_TOKEN_ADDRESSES.push(...getTestTokenAddresses(network.type))

  // Set up ETH placeholders
  tokenContracts.set(ethAddress, ETH_CONTRACT)
  tokenDecimals.set(ETH_CONTRACT, network?.nativeCurrency?.decimals || '18')
  tokenNames.set(ETH_CONTRACT, network?.nativeCurrency?.name || 'Ether')
  tokenSymbols.set(ETH_CONTRACT, network?.nativeCurrency?.symbol || 'Eth')

  const settings = {
    network,
    ethToken: {
      address: ethAddress,
    },
    vault: {
      address: vaultAddress,
      contract: vaultContract,
    },
  }

  let vaultInitializationBlock

  try {
    vaultInitializationBlock = await settings.vault.contract
      .getInitializationBlock()
      .toPromise()
  } catch (err) {
    console.error("Could not get attached vault's initialization block:", err)
  }

  return app.store(
    async (state, event) => {
      const { vault } = settings
      const { address: eventAddress, event: eventName } = event
      const nextState = {
        ...state,
      }

      if (eventName === events.SYNC_STATUS_SYNCING) {
        return { ...nextState, isSyncing: true }
      } else if (eventName === events.SYNC_STATUS_SYNCED) {
        return { ...nextState, isSyncing: false }
      }

      // Vault event
      if (addressesEqual(eventAddress, vault.address)) {
        return vaultLoadBalance(nextState, event, settings)
      }

      // Finance event
      switch (eventName) {
        case 'ChangePeriodDuration':
          nextState.periodDuration = marshallDate(
            event.returnValues.newDuration
          )
          return nextState
        case 'NewPeriod':
          return newPeriod(nextState, event, settings)
        case 'NewTransaction':
          return newTransaction(nextState, event, settings)
        default:
          return nextState
      }
    },
    {
      init: initializeState(settings),
      externals: [
        {
          contract: settings.vault.contract,
          initializationBlock: vaultInitializationBlock,
        },
      ],
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
    periodDuration: marshallDate(
      await app.call('getPeriodDuration').toPromise()
    ),
    vaultAddress: settings.vault.address,
  }
  const withInitialTokens = await loadInitialTokens(
    newState,
    getPresetTokens(settings.network.type), // always immediately load some tokens
    settings
  )
  const withTestnetState = await loadTestnetTokenBalances(
    withInitialTokens,
    settings
  )

  return withTestnetState
}

async function loadInitialTokens(state, includedTokenAddresses, settings) {
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
    newBalances
      .map(({ address }) => address)
      .concat(includedTokenAddresses || [])
  )
  for (const address of addresses) {
    newBalances = await updateBalances(newBalances, address, settings, {
      reloadEntireToken: true,
    })
  }

  return {
    ...newState,
    balances: newBalances,
  }
}

async function vaultLoadBalance(state, { returnValues: { token } }, settings) {
  return {
    ...state,
    balances: await updateBalances(
      state.balances,
      token || settings.ethToken.address,
      settings
    ),
  }
}

async function newPeriod(
  state,
  { returnValues: { periodId, periodStarts, periodEnds } }
) {
  return {
    ...state,
    periods: await updatePeriods(state.periods, {
      id: periodId,
      startTime: marshallDate(periodStarts),
      endTime: marshallDate(periodEnds),
    }),
  }
}

async function newTransaction(
  state,
  { transactionHash, returnValues: { reference, transactionId } },
  settings
) {
  const transactionDetails = {
    ...(await loadTransactionDetails(transactionId)),
    reference,
    transactionHash,
    id: transactionId,
  }
  const transactions = await updateTransactions(
    state.transactions,
    transactionDetails
  )
  const balances = await updateBalances(
    state.balances,
    transactionDetails.token,
    settings
  )

  return {
    ...state,
    balances,
    transactions,
  }
}

/***********************
 *                     *
 *    Token Helpers    *
 *                     *
 ***********************/

function loadTokenBalance(tokenContract, tokenAddress, { ethToken, vault }) {
  if (addressesEqual(tokenAddress, ethToken.address)) {
    return vault.contract.balance(tokenAddress).toPromise()
  } else {
    // Prefer using the token contract directly to ask for the Vault's balance
    // Web3.js does not handle revert strings yet, so a failing call to Vault.balance()
    // results in organizations looking like whales.
    return tokenContract.balanceOf(vault.address).toPromise()
  }
}

async function loadTokenDecimals(tokenContract, tokenAddress, { network }) {
  if (tokenDecimals.has(tokenContract)) {
    return tokenDecimals.get(tokenContract)
  }

  const override = tokenDataOverride(tokenAddress, 'decimals', network.type)

  let decimals
  try {
    decimals = override || (await tokenContract.decimals().toPromise())
    tokenDecimals.set(tokenContract, decimals)
  } catch (err) {
    // decimals is optional
    decimals = '0'
  }
  return decimals
}

async function loadTokenName(tokenContract, tokenAddress, { network }) {
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

async function loadTokenSymbol(tokenContract, tokenAddress, { network }) {
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

/*****************************
 *                           *
 *    Transaction Helpers    *
 *                           *
 *****************************/

async function updateBalances(
  balances,
  tokenAddress,
  settings,
  { reloadEntireToken } = {}
) {
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
    const updatedState = reloadEntireToken
      ? await newBalanceEntry(tokenContract, tokenAddress, settings)
      : {
          amount: await loadTokenBalance(tokenContract, tokenAddress, settings),
        }
    newBalances[balancesIndex] = {
      ...newBalances[balancesIndex],
      ...updatedState,
    }
    return newBalances
  }
}

function updatePeriods(periods, periodDetails) {
  const newPeriods = Array.from(periods || [])

  const periodsIndex = newPeriods.findIndex(({ id }) => id === periodDetails.id)
  if (periodsIndex === -1) {
    return newPeriods.concat(periodDetails)
  } else {
    newPeriods[periodsIndex] = periodDetails
    return newPeriods
  }
}

function updateTransactions(transactions, transactionDetails) {
  const newTransactions = Array.from(transactions || [])

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

async function newBalanceEntry(tokenContract, tokenAddress, settings) {
  const [balance, decimals, name, symbol] = await Promise.all([
    loadTokenBalance(tokenContract, tokenAddress, settings),
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

async function loadTransactionDetails(id) {
  return marshallTransactionDetails(
    // Wrap with retry in case the transaction is somehow not present
    await retryEvery(() =>
      app
        .call('getTransaction', id)
        .toPromise()
        .catch(err => {
          console.error(`Error fetching transaction (${id})`, err)
          throw err
        })
    )
  )
}

function marshallTransactionDetails({
  amount,
  date,
  entity,
  isIncoming,
  paymentId,
  periodId,
  token,
}) {
  return {
    amount,
    entity,
    isIncoming,
    paymentId,
    periodId,
    token,
    date: marshallDate(date),
  }
}

function marshallDate(date) {
  // Represent dates as real numbers, as it's very unlikely they'll hit the limit...
  // Adjust for js time (in ms vs s)
  return parseInt(date, 10) * 1000
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
