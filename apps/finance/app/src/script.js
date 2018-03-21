import Aragon from '@aragon/client'
import financeSettings, { hasLoadedFinanceSettings } from './finance-settings'
import tokenBalanceOfAbi from './abi/token-balanceof.json'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenSymbolAbi from './abi/token-symbol.json'

const tokenAbi = [].concat(tokenBalanceOfAbi, tokenDecimalsAbi, tokenSymbolAbi)

const tokenContracts = new Map() // Addr -> External contract
const tokenSymbols = new Map() // External contract -> symbol

const app = new Aragon()

// Hook up the script as an aragon.js store
app.store(async (state, event) => {
  // **NOTE**: Thankfully, the Finance app always creates an event when it's
  // initialized (NewPeriod), so store will always be invoked at least once
  const { event: eventName, returnValues } = event
  let nextState = {
    ...state,
    // Fetch the app's settings, if we haven't already
    ...(!hasLoadedFinanceSettings(state) ? await loadFinanceSettings() : {}),
  }

  switch (eventName) {
    case 'NewTransaction':
      nextState = await newTransaction(nextState, returnValues, event)
      break
    default:
      break
  }

  // NOTE: this is only for rinkeby!
  nextState = await loadTestState(nextState)

  return nextState
})

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

async function newTransaction(state, { transactionId }, { transactionHash }) {
  const transactionDetails = {
    ...(await loadTransactionDetails(transactionId)),
    transactionHash,
    id: transactionId,
  }
  const balances = await updateBalances(state, transactionDetails)
  const transactions = await updateTransactions(state, transactionDetails)

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

async function updateBalances(
  { balances = [], vaultAddress },
  { token: tokenAddress }
) {
  const tokenContract = tokenContracts.has(tokenAddress)
    ? tokenContracts.get(tokenAddress)
    : app.external(tokenAddress, tokenAbi)
  tokenContracts.set(tokenAddress, tokenContract)

  const balancesIndex = balances.findIndex(
    ({ address }) => address === tokenAddress
  )
  if (balancesIndex === -1) {
    return balances.concat(
      await makeNewBalanceToken(tokenContract, tokenAddress, vaultAddress)
    )
  } else {
    const newBalances = Array.from(balances)
    newBalances[balancesIndex] = {
      ...balances[balancesIndex],
      amount: await loadTokenBalance(tokenContract, vaultAddress),
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

async function makeNewBalanceToken(tokenContract, tokenAddress, vaultAddress) {
  const [balance, decimals, symbol] = await Promise.all([
    loadTokenBalance(tokenContract, vaultAddress),
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

function loadTokenBalance(tokenContract, vaultAddress) {
  return new Promise((resolve, reject) => {
    if (!vaultAddress) {
      // No vault address yet, so leave it as unknown
      resolve(-1)
    } else {
      tokenContract
        .balanceOf(vaultAddress)
        .first()
        .map(val => parseInt(val, 10))
        .subscribe(resolve, reject)
    }
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

function loadFinanceSettings() {
  return Promise.all(
    financeSettings.map(
      ([name, key, type]) =>
        new Promise((resolve, reject) =>
          app
            .call(name)
            .first()
            .map(val => (type === 'number' ? parseInt(val, 10) : val))
            .subscribe(value => {
              resolve({ [key]: value })
            }, reject)
        )
    )
  )
    .then(settings =>
      settings.reduce((acc, setting) => ({ ...acc, ...setting }), {})
    )
    .catch(err => {
      console.error("Failed to load finance's settings due to:", err)
      // Return an empty object to try again later
      return {}
    })
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
    date: parseInt(date, 10),
    paymentId: parseInt(paymentId, 10),
    periodId: parseInt(periodId, 10),
  }
}

/**********************
 *                    *
 * RINKEBY TEST STATE *
 *                    *
 **********************/
const TEST_TOKEN_ADDRS = [
  '0x0d5263b7969144a852d58505602f630f9b20239d',
  '0x6142214d83670226872d51e935fb57bec8832a60',
  '0x1e1cab55639f67e70973586527ec1dfdaf9bf764',
  '0x5e381afb0104d374f1f3ccde5ba7fe8f5b8af0e6',
  '0xa53899a7eb70b309f05f8fdb344cdc8c8f272abe',
  '0x5b2fdbba47e8ae35b9d6f8e1480703334f48b96c',
  '0x51e53b52555a4ab7227423a7761cc8e418b147c8',
  '0xc42da14b1c0ae7d4dd3946633f1046c3d46f3101',
  '0x4fc6e3b791560f25ed4c1bf5e2db9ab0d0e80747',
]

function loadTestState(nextState) {
  // Reload all the test tokens' balances for this DAO's vault
  return loadTestTokenBalances(nextState)
}

async function loadTestTokenBalances(nextState) {
  let reducedState = nextState
  for (let tokenAddress of TEST_TOKEN_ADDRS) {
    reducedState = {
      ...nextState,
      balances: await updateBalances(reducedState, { token: tokenAddress }),
    }
  }
  return reducedState
}
