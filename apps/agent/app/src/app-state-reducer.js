import BN from 'bn.js'
import { ETHER_TOKEN_FAKE_ADDRESS } from './lib/token-utils'

// Use this function to sort by ETH and then token symbol
const compareBalancesByEthAndSymbol = (tokenA, tokenB) => {
  if (tokenA.address === ETHER_TOKEN_FAKE_ADDRESS) {
    return -1
  }
  if (tokenB.address === ETHER_TOKEN_FAKE_ADDRESS) {
    return 1
  }
  return tokenA.symbol.localeCompare(tokenB.symbol)
}

function appStateReducer(state) {
  const { balances = [], transactions = [] } = state || {
    balances: [],
    transactions: [],
  }
  const balancesBn = balances
    .map(balance => ({
      ...balance,
      amount: new BN(balance.amount),
      decimals: new BN(balance.decimals),
    }))
    .sort(compareBalancesByEthAndSymbol)

  const transactionsBn = transactions.map(transaction => ({
    ...transaction,
    isIncoming: transaction.tokenTransfers.some(({ from }) => !!from),
    isOutgoing: transaction.tokenTransfers.some(({ to }) => !!to),
    tokenTransfers: transaction.tokenTransfers.map(transfer => ({
      ...transfer,
      amount: new BN(transfer.amount),
    })),
  }))

  return {
    ...state,

    tokens: balancesBn.map(({ address, decimals, name, symbol, verified }) => ({
      address,
      decimals: decimals.toNumber(),
      name,
      symbol,
      verified,
    })),

    // Filter out empty balances
    balances: balancesBn.filter(balance => !balance.amount.isZero()),

    transactions: transactionsBn,
  }
}

export default appStateReducer
