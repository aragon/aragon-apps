import Aragon from '@aragon/client'
import { combineLatest, of } from './rxjs'
import { testTokenAddresses } from './testnet'
import { addressesEqual } from './web3-utils'
import tokenBalanceOfAbi from './abi/token-balanceof.json'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenSymbolAbi from './abi/token-symbol.json'
import vaultBalanceAbi from './abi/vault-balance.json'

const tokenAbi = [].concat(tokenBalanceOfAbi, tokenDecimalsAbi, tokenSymbolAbi)

const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')
const tokenContracts = new Map() // Addr -> External contract
const tokenSymbols = new Map() // External contract -> symbol

const app = new Aragon()

combineLatest(
  app.call('vault'),
  /**
   * app.call('ETH')
   *
   * Is how we should be getting the ETH token, but aragon-dev-cli doesn't know
   * about public constants on contracts :(
   */
  of('0x0000000000000000000000000000000000000000')
)
  .first()
  .subscribe(addresses => initialize(...addresses))

async function initialize(vaultAddress, ethAddress) {
  const vaultContract = app.external(vaultAddress, vaultBalanceAbi)

  // Place dummy contract for ETH
  tokenContracts.set(ethAddress, null)

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
  { transactionHash, returnValues: { transactionId } },
  settings
) {
  const transactionDetails = {
    ...(await loadTransactionDetails(transactionId)),
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
  const isEthToken = tokenAddress === settings.ethToken.address
  const [balance, decimals, symbol] = await Promise.all([
    loadTokenBalance(tokenAddress, settings),
    isEthToken ? Promise.resolve(18) : loadTokenDecimals(tokenContract),
    isEthToken ? Promise.resolve('ETH') : loadTokenSymbol(tokenContract),
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
      .map(val => parseInt(val, 10))
      .subscribe(resolve, reject)
  })
}

function loadTokenDecimals(tokenContract) {
  return new Promise((resolve, reject) => {
    tokenContract
      .decimals()
      .first()
      .map(val => parseInt(val, 10))
      .subscribe(resolve, reject)
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
  reference,
  token,
}) {
  return {
    entity,
    isIncoming,
    reference,
    token,
    amount: parseInt(amount, 10),
    date: parseInt(date, 10) * 1000, // adjust for JS time (in ms vs s)
    paymentId: parseInt(paymentId, 10),
    periodId: parseInt(periodId, 10),
  }
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
  for (let tokenAddress of testTokenAddresses) {
    reducedState = {
      ...reducedState,
      balances: await updateBalances(reducedState, tokenAddress, settings),
    }
  }
  return reducedState
}
