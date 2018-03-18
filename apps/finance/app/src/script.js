import Aragon from '@aragon/client'
import financeSettings, { hasLoadedFinanceSettings } from './finance-settings'
import tokenBalanceOfAbi from './abi/token-balanceof.json'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenSymbolAbi from './abi/token-symbol.json'

const app = new Aragon()
const tokenSymbols = new Map()
const tokenAbi = [].concat(tokenBalanceOfAbi, tokenDecimalsAbi, tokenSymbolAbi)

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
  const transactions = await updateTransaction(state, transactionDetails)

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
  const token = app.external(tokenAddr, tokenAbi)

  const balancesIndex = balances.findIndex(
    ({ address }) => address === tokenAddr
  )
  if (balancesIndex === -1) {
    return balances.concat(
      await makeNewBalanceToken(token, tokenAddr, vaultAddress)
    )
  } else {
    const newBalances = Array.from(balances)
    newBalances[balancesIndex] = {
      ...balances[balancesIndex],
      amount: await loadTokenBalance(token, vaultAddress),
    }
    return newBalances
  }
}

function updateTransaction({ transactions = [] }, transactionDetails) {
  const transactionIndex = transactions.findIndex(
    ({ id }) => id === transactionDetails.id
  )
  if (transactionIndex === -1) {
    return transactions.concat(transactionDetails)
  } else {
    const newTransactions = Array.from(transactions)
    newTransactions[transactionIndex] = transactionDetails
    return newTransactions
  }
}

async function makeNewBalanceToken(token, tokenAddr, vaultAddr) {
  const [balance, decimals, symbol] = await Promise.all([
    loadTokenBalance(token, vaultAddr),
    loadTokenDecimals(token),
    loadTokenSymbol(token, tokenAddr),
  ])

  return { balance, decimals, symbol }
}

function loadTokenBalance(token, vaultAddr) {
  return new Promise((resolve, reject) => {
    if (!vaultAddr) {
      // No vault address yet, so leave it as unknown
      resolve(-1)
    } else {
      token
        .balanceOf(vaultAddr)
        .first()
        .subscribe(resolve, reject)
    }
  })
}

function loadTokenDecimals(token) {
  return new Promise((resolve, reject) => {
    token
      .decimals()
      .first()
      .subscribe(resolve, reject)
  })
}

function loadTokenSymbol(token, tokenAddr) {
  return new Promise((resolve, reject) => {
    if (tokenSymbols.has(tokenAddr)) {
      resolve(tokenSymbols.get(tokenAddr))
    } else {
      const token = app.external(tokenAddr, tokenSymbolAbi)
      token
        .symbol()
        .first()
        .subscribe(symbol => {
          tokenSymbols.set(tokenAddr, symbol)
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
