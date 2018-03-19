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
  { token: tokenAddr }
) {
  const tokenContract = tokenContracts.has(tokenAddr)
    ? tokenContracts.get(tokenAddr)
    : app.external(tokenAddr, tokenAbi)
  tokenContracts.set(tokenAddr, tokenContract)

  const balancesIndex = balances.findIndex(
    ({ address }) => address === tokenAddr
  )
  if (balancesIndex === -1) {
    return balances.concat(
      await makeNewBalanceToken(tokenContract, tokenAddr, vaultAddress)
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

async function makeNewBalanceToken(tokenContract, tokenAddr, vaultAddr) {
  const [balance, decimals, symbol] = await Promise.all([
    loadTokenBalance(tokenContract, vaultAddr),
    loadTokenDecimals(tokenContract),
    loadTokenSymbol(tokenContract),
  ])

  return {
    decimals,
    symbol,
    address: tokenAddr,
    amount: balance,
  }
}

function loadTokenBalance(tokenContract, vaultAddr) {
  return new Promise((resolve, reject) => {
    if (!vaultAddr) {
      // No vault address yet, so leave it as unknown
      resolve(-1)
    } else {
      tokenContract
        .balanceOf(vaultAddr)
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
