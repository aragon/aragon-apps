import Aragon from '@aragon/client'
import { of } from './rxjs'
import { getTestTokenAddresses } from './testnet'
import { addressesEqual } from './lib/web3-utils'
import tokenBalanceOfAbi from './abi/token-balanceof.json'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenSymbolAbi from './abi/token-symbol.json'
import vaultBalanceAbi from './abi/vault-balance.json'

const tokenAbi = [].concat(tokenBalanceOfAbi, tokenDecimalsAbi, tokenSymbolAbi)

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')
const TEST_TOKEN_ADDRESSES = []
const tokenContracts = new Map() // Addr -> External contract
const tokenDecimals = new Map() // External contract -> decimals
const tokenSymbols = new Map() // External contract -> symbol

/**
 * app.call('ETH')
 *
 * Is how we should be getting the ETH token, but aragon-cli doesn't extract
 * public constants in contracts into the artifact :(
 */
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'
const ETH_CONTRACT = Symbol('ETH_CONTRACT')

const app = new Aragon()

/*
 * Calls `callback` exponentially, everytime `retry()` is called.
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
const retryEvery = (callback, initialRetryTimer = 1000, increaseFactor = 5) => {
  const attempt = (retryTimer = initialRetryTimer) => {
    // eslint-disable-next-line standard/no-callback-literal
    callback(() => {
      console.error(`Retrying in ${retryTimer / 1000}s...`)

      // Exponentially backoff attempts
      setTimeout(() => attempt(retryTimer * increaseFactor), retryTimer)
    })
  }
  attempt()
}

// Get the token address to initialize ourselves
retryEvery(retry => {
  app
    .call('vault')
    .first()
    .subscribe(
      vaultAddress => initialize(vaultAddress, ETH_ADDRESS),
      err => {
        console.error(
          'Could not start background script execution due to the contract not loading the token:',
          err
        )
        retry()
      }
    )
})

async function initialize(vaultAddress, ethAddress) {
  const vaultContract = app.external(vaultAddress, vaultBalanceAbi)

  const network = await app
    .network()
    .take(1)
    .toPromise()
  TEST_TOKEN_ADDRESSES.push(...getTestTokenAddresses(network.type))

  // Set up ETH placeholders
  tokenContracts.set(ethAddress, ETH_CONTRACT)
  tokenDecimals.set(ETH_CONTRACT, '18')
  tokenSymbols.set(ETH_CONTRACT, 'ETH')

  return createStore({
    ethToken: {
      address: ethAddress,
    },
    vault: {
      address: vaultAddress,
      contract: vaultContract,
    },
  })
}

// Hook up the script as an aragon.js store
function createStore(settings) {
  return app.store(
    async (state, event) => {
      const { vault } = settings
      const { address: eventAddress, event: eventName } = event
      let nextState = {
        ...state,
      }

      // Get the proxy address once
      if (eventName === 'NewPeriod' && !state.proxyAddress) {
        nextState.proxyAddress = eventAddress
      }

      if (eventName === INITIALIZATION_TRIGGER) {
        nextState = await initializeState(nextState, settings)
      } else if (addressesEqual(eventAddress, vault.address)) {
        // Vault event
        // Note: it looks like vault events don't have a defined `event.event` or anything in the
        // `event.returnValues`... so let's just refetch its ETH balance.
        nextState = await vaultLoadBalance(nextState, event, settings)
      } else {
        // Finance event
        switch (eventName) {
          case 'NewTransaction':
            nextState = await newTransaction(nextState, event, settings)
            break
          default:
            break
        }
      }

      return nextState
    },
    [
      // Always initialize the store with our own home-made event
      of({ event: INITIALIZATION_TRIGGER }),
      // Handle Vault events in case they're not always controlled by this Finance app
      settings.vault.contract.events(),
    ]
  )
}

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

async function initializeState(state, settings) {
  const nextState = {
    ...state,
    vaultAddress: settings.vault.address,
  }

  const withTestnetState = await loadTestnetState(nextState, settings)
  const withEthBalance = await loadEthBalance(withTestnetState, settings)
  return withEthBalance
}

async function vaultLoadBalance(state, { returnValues: { token } }, settings) {
  return {
    ...state,
    balances: await updateBalances(
      state,
      token || settings.ethToken.address,
      settings
    ),
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
  const transactions = await updateTransactions(state, transactionDetails)
  const balances = await updateBalances(
    state,
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
 *       Helpers       *
 *                     *
 ***********************/

async function updateBalances({ balances = [] }, tokenAddress, settings) {
  const tokenContract = tokenContracts.has(tokenAddress)
    ? tokenContracts.get(tokenAddress)
    : app.external(tokenAddress, tokenAbi)
  tokenContracts.set(tokenAddress, tokenContract)

  const balancesIndex = balances.findIndex(({ address }) =>
    addressesEqual(address, tokenAddress)
  )
  if (balancesIndex === -1) {
    return balances.concat(
      await newBalanceEntry(tokenContract, tokenAddress, settings)
    )
  } else {
    const newBalances = Array.from(balances)
    newBalances[balancesIndex] = {
      ...balances[balancesIndex],
      amount: await loadTokenBalance(tokenAddress, settings),
    }
    return newBalances
  }
}

function updateTransactions({ transactions = [] }, transactionDetails) {
  const transactionsIndex = transactions.findIndex(
    ({ id }) => id === transactionDetails.id
  )
  if (transactionsIndex === -1) {
    return transactions.concat(transactionDetails)
  } else {
    const newTransactions = Array.from(transactions)
    newTransactions[transactionsIndex] = transactionDetails
    return newTransactions
  }
}

async function newBalanceEntry(tokenContract, tokenAddress, settings) {
  const [balance, decimals, symbol] = await Promise.all([
    loadTokenBalance(tokenAddress, settings),
    loadTokenDecimals(tokenContract),
    loadTokenSymbol(tokenContract),
  ])

  return {
    decimals,
    symbol,
    address: tokenAddress,
    amount: balance,
  }
}

async function loadEthBalance(state, settings) {
  return {
    ...state,
    balances: await updateBalances(state, settings.ethToken.address, settings),
  }
}

function loadTokenBalance(tokenAddress, { vault }) {
  return new Promise((resolve, reject) => {
    vault.contract
      .balance(tokenAddress)
      .first()
      .subscribe(resolve, reject)
  })
}

function loadTokenDecimals(tokenContract) {
  return new Promise((resolve, reject) => {
    if (tokenDecimals.has(tokenContract)) {
      resolve(tokenDecimals.get(tokenContract))
    } else {
      tokenContract
        .decimals()
        .first()
        .subscribe(decimals => {
          tokenDecimals.set(tokenContract, decimals)
          resolve(decimals)
        }, reject)
    }
  })
}

function loadTokenSymbol(tokenContract) {
  return new Promise((resolve, reject) => {
    if (tokenSymbols.has(tokenContract)) {
      resolve(tokenSymbols.get(tokenContract))
    } else {
      tokenContract
        .symbol()
        .first()
        .subscribe(symbol => {
          tokenSymbols.set(tokenContract, symbol)
          resolve(symbol)
        }, reject)
    }
  })
}

function loadTransactionDetails(id) {
  return new Promise((resolve, reject) =>
    app
      .call('getTransaction', id)
      .first()
      .subscribe(
        transaction => resolve(marshallTransactionDetails(transaction)),
        reject
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

function loadTestnetState(nextState, settings) {
  // Reload all the test tokens' balances for this DAO's vault
  return loadTestnetTokenBalances(nextState, settings)
}

async function loadTestnetTokenBalances(nextState, settings) {
  let reducedState = nextState
  for (const tokenAddress of TEST_TOKEN_ADDRESSES) {
    reducedState = {
      ...reducedState,
      balances: await updateBalances(reducedState, tokenAddress, settings),
    }
  }
  return reducedState
}
