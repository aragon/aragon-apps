import {
  getTokenStartBlock,
  getTokenCreationDate,
  getTransferable,
  isTokenVerified,
} from '../utils/token-utils'
import { 
  getPresetTokens,
  getTokenDecimals,
  getTokenName,
  getTokenSymbol,
  tokenDataOverride
} from '../../../../shared/lib/token-utils'
import { addressesEqual } from '../utils/web3-utils'
import tokenSymbolAbi from '../../../../shared/abi/token-symbol.json'
import tokenNameAbi from '../../../../shared/abi/token-name.json'
import tokenBalanceAbi from '../../../../shared/abi/token-balanceof.json'
import tokenDecimalsAbi from '../../../../shared/abi/token-decimals.json'
import { app } from './'

const tokenAbi = [].concat(
  tokenSymbolAbi,
  tokenNameAbi,
  tokenBalanceAbi,
  tokenDecimalsAbi
)

const tokenContracts = new Map() // Addr -> External contract
const tokenDecimals = new Map() // External contract -> decimals
const tokenName = new Map() // External contract -> name
const tokenSymbols = new Map() // External contract -> symbol
const tokensTransferable = new Map() // External contract -> symbol
const tokenStartBlock = new Map() // External contract -> creationBlock (uint)
const tokenCreationDate = new Map()

const ETH_CONTRACT = Symbol('ETH_CONTRACT')

export async function initializeTokens(state, settings){
  // Set up ETH placeholders
  tokenContracts.set(settings.ethToken.address, ETH_CONTRACT)
  tokenDecimals.set(ETH_CONTRACT, '18')
  tokenName.set(ETH_CONTRACT, 'Ether')
  tokenSymbols.set(ETH_CONTRACT, 'ETH')
  tokensTransferable.set(ETH_CONTRACT, true)
  tokenStartBlock.set(ETH_CONTRACT, null)
  tokenCreationDate.set(ETH_CONTRACT, new Date(0))

  const newState = await loadTokenBalances(
    state,
    getPresetTokens(settings.network.type),
    settings)
  return { ...newState, amountTokens: [] }
}

export async function vaultLoadBalance(state, { returnValues }, settings) {
  const { token } = returnValues
  const { balances, refTokens } = await updateBalancesAndRefTokens(
    state,
    token || settings.ethToken.address,
    settings
  )
  return {
    ...state,
    balances,
    refTokens,
  }
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

async function loadEthBalance(state, settings) {
  const { balances } = await updateBalancesAndRefTokens(state, settings.ethToken.address, settings)
  return {
    ...state,
    balances,
  }
}

async function loadTokenBalances(state, includedTokenAddresses, settings) {
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
    newBalances.map(({ address }) => address).concat(includedTokenAddresses || [])
  )
  for (const address of addresses) {
    const { balances, refTokens } = await updateBalancesAndRefTokens(newState, address, settings)
    newState = {
      ...newState,
      balances,
      refTokens
    }
  }

  return newState
}

export async function updateBalancesAndRefTokens({ balances = [], refTokens = [] }, tokenAddress, settings) {
  const tokenContract = tokenContracts.has(tokenAddress)
    ? tokenContracts.get(tokenAddress)
    : app.external(tokenAddress, tokenAbi)
  tokenContracts.set(tokenAddress, tokenContract)
  const balancesIndex = balances.findIndex(({ address }) =>
    addressesEqual(address, tokenAddress)
  )
  if (balancesIndex === -1) {
    const newBalance = await newBalanceEntry(tokenContract, tokenAddress, settings)
    let newRefTokens = Array.from(refTokens)
    if (newBalance.startBlock !== null) {
      const refIndex = refTokens.findIndex(({ address }) =>
        addressesEqual(address, tokenAddress)
      )

      if (refIndex === -1) {
        const {
          name,
          symbol,
          address,
          startBlock,
          creationDate,
          decimals,
        } = newBalance
        newRefTokens = newRefTokens.concat({
          name,
          symbol,
          address,
          startBlock,
          creationDate,
          decimals,
        })
      }
    }
    const newBalances = balances.concat(newBalance)
    return { balances: newBalances, refTokens: newRefTokens }
  } else {
    const newBalances = Array.from(balances)
    newBalances[balancesIndex] = {
      ...balances[balancesIndex],
      amount: await loadTokenBalance(tokenAddress, settings),
    }

    return { balances: newBalances, refTokens }
  }
}

async function newBalanceEntry(tokenContract, tokenAddress, settings) {
  const [
    balance,
    decimals,
    name,
    symbol,
    startBlock,
    creationDate,
    transfersEnabled,
  ] = await Promise.all([
    loadTokenBalance(tokenAddress, settings),
    loadTokenDecimals(tokenContract, tokenAddress, settings),
    loadTokenName(tokenContract, tokenAddress, settings),
    loadTokenSymbol(tokenContract, tokenAddress, settings),
    loadTokenStartBlock(tokenContract, tokenAddress, settings),
    loadTokenCreationDate(tokenContract, tokenAddress, settings),
    loadTransferable(tokenContract, tokenAddress, settings),
  ])

  return {
    decimals,
    name,
    symbol,
    address: tokenAddress,
    amount: balance,
    startBlock,
    creationDate,
    transfersEnabled,
    verified:
      isTokenVerified(tokenAddress, settings.network.type) ||
      addressesEqual(tokenAddress, settings.ethToken.address),
  }
}

function loadTokenBalance(tokenAddress, { vault }) {
  return vault.contract.balance(tokenAddress).toPromise()
}

function loadTokenDecimals(tokenContract, tokenAddress, { network }) {
  return new Promise(resolve => {
    if (tokenDecimals.has(tokenContract)) {
      resolve(tokenDecimals.get(tokenContract))
    } else {
      const override =
        tokenDataOverride(tokenAddress, 'decimals', network.type)

      const tokenDecimals = getTokenDecimals(app, tokenAddress)
      resolve(override || tokenDecimals || '0')
    }
  })
}

function loadTokenName(tokenContract, tokenAddress, { network }) {
  return new Promise(resolve => {
    if (tokenName.has(tokenContract)) {
      resolve(tokenName.get(tokenContract))
    } else {
      const override =
        tokenDataOverride(tokenAddress, 'name', network.type)
      const name = getTokenName(app, tokenAddress)
      resolve(override || name || '')
    }
  })
}

function loadTokenSymbol(tokenContract, tokenAddress, { network }) {
  return new Promise(resolve => {
    if (tokenSymbols.has(tokenContract)) {
      resolve(tokenSymbols.get(tokenContract))
    } else {
      const override =
        tokenDataOverride(tokenAddress, 'symbol', network.type)
      const tokenSymbol = getTokenSymbol(app, tokenAddress)
      resolve(override || tokenSymbol || '')
    }
  })
}

function loadTransferable(tokenContract, tokenAddress, { network }) {
  return new Promise(resolve => {
    if (tokensTransferable.has(tokenContract)) {
      resolve(tokensTransferable.get(tokenContract))
    } else {
      const override =
        tokenDataOverride(tokenAddress, 'transfersEnabled', network.type)
      const tokenTransferable = getTransferable(app, tokenAddress)
      resolve(override || tokenTransferable || false)
    }
  })
}

function loadTokenStartBlock(tokenContract, tokenAddress) {
  return new Promise(resolve => {
    if (tokenStartBlock.has(tokenContract)) {
      resolve(tokenStartBlock.get(tokenContract))
    } else {
      const tokenStartBlock = getTokenStartBlock(app, tokenAddress)
      resolve(tokenStartBlock)
    }
  })
}

function loadTokenCreationDate(tokenContract, tokenAddress) {
  return new Promise(resolve => {
    if (tokenStartBlock.has(tokenContract)) {
      resolve(tokenCreationDate.get(tokenContract))
    } else {
      const tokenCreationDate = getTokenCreationDate(app, tokenAddress)
      resolve(tokenCreationDate)
    }
  })
}
