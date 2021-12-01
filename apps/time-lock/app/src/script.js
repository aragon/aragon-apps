import 'core-js/stable'
import 'regenerator-runtime/runtime'
import Aragon, { events } from '@aragon/api'
import { addressesEqual } from './lib/web3-utils'
import tokenAbi from './abi/token.json'
import retryEvery from './lib/retry-every'
import lockSettings from './lib/lock-settings'

const app = new Aragon()

retryEvery(() =>
  app
    .call('token')
    .subscribe(initialize, err =>
      console.error(
        `Could not start background script execution due to the contract not loading token: ${err}`
      )
    )
)

async function initialize(tokenAddress) {
  const tokenContract = app.external(tokenAddress, tokenAbi)
  return createStore(tokenContract)
}

async function createStore(tokenContract) {
  const currentBlock = await getBlockNumber()

  return app.store(
    (state, { event, returnValues, blockNumber }) => {
      // dont want to listen for past events for now
      // (our app state can be obtained from smart contract vars)
      if (blockNumber && blockNumber <= currentBlock) return state

      let nextState = {
        ...state,
      }

      switch (event) {
        case events.ACCOUNTS_TRIGGER:
          return updateConnectedAccount(nextState, returnValues)
        case events.SYNC_STATUS_SYNCING:
          return { ...nextState, isSyncing: true }
        case events.SYNC_STATUS_SYNCED:
          return { ...nextState, isSyncing: false }
        case 'ChangeLockDuration':
          return updateLockDuration(nextState, returnValues)
        case 'ChangeLockAmount':
          return updateLockAmount(nextState, returnValues)
        case 'ChangeSpamPenaltyFactor':
          return updateSpamPenaltyFactor(nextState, returnValues)
        case 'NewLock':
          return newLock(nextState, returnValues)
        case 'Withdrawal':
          return newWithdrawal(nextState, returnValues)
        default:
          return state
      }
    },
    {
      init: initializeState(tokenContract),
    }
  )
}

/***********************
 *                     *
 *   Event Handlers    *
 *                     *
 ***********************/

function initializeState(tokenContract) {
  return async cachedState => {
    let token = await getTokenData(tokenContract)
    token && app.indentify(`Lock ${token.tokenSymbol}`)

    return {
      ...cachedState,
      ...token,
      ...(await getLockSettings()),
      isSyncing: true,
    }
  }
}

async function updateConnectedAccount(state, { account }) {
  const locks = []
  if (account) {
    const lockCount = await app.call('getWithdrawLocksCount', account).toPromise()


    for (let i = 0; i < lockCount; i++) {
      let { unlockTime, lockAmount } = await app
        .call('addressesWithdrawLocks', account, i)
        .toPromise()
      locks.push({ unlockTime: marshallDate(unlockTime), lockAmount })
    }
  }
  return {
    ...state,
    locks,
    account,
  }
}

async function updateLockDuration(state, { newLockDuration }) {
  return {
    ...state,
    lockDuration: marshallDate(newLockDuration),
  }
}

async function updateLockAmount(state, { newLockAmount }) {
  return {
    ...state,
    lockAmount: newLockAmount,
  }
}

async function updateSpamPenaltyFactor(state, { newSpamPenaltyFactor }) {
  return {
    ...state,
    spamPenaltyFactor: newSpamPenaltyFactor,
  }
}

async function newLock(state, { lockAddress, unlockTime, lockAmount }) {
  const { account, locks } = state

  // skip if no connected account or new lock doesn't correspond to connected account
  if (!(account && addressesEqual(lockAddress, account))) return state

  return {
    ...state,
    locks: [...locks, { unlockTime: marshallDate(unlockTime), lockAmount }],
  }
}

async function newWithdrawal(state, { withdrawalAddress, withdrawalLockCount }) {
  const { account, locks } = state

  // skip if no connected account or new withdrawl doesn't correspond to connected account
  if (!(account && addressesEqual(withdrawalAddress, account))) return state

  return {
    ...state,
    locks: locks.slice(withdrawalLockCount),
  }
}

/***********************
 *                     *
 *       Helpers       *
 *                     *
 ***********************/

async function getTokenData(contract) {
  try {
    // TODO: check for contracts that use bytes32 as symbol() return value (same for name)
    const [tokenName, tokenSymbol, tokenDecimals] = await Promise.all([
      contract.name().toPromise(),
      contract.symbol().toPromise(),
      contract.decimals().toPromise(),
    ])

    return {
      tokenName,
      tokenSymbol,
      tokenDecimals,
    }
  } catch (err) {
    console.error('Error loading token data: ', err)
    return {}
  }
}

async function getLockSettings() {
  return Promise.all(
    lockSettings.map(([name, key, type = 'string']) =>
      app
        .call(name)
        .toPromise()
        .then(val => (type === 'time' ? marshallDate(val) : val))
        .then(value => ({ [key]: value }))
    )
  )
    .then(settings => settings.reduce((acc, setting) => ({ ...acc, ...setting }), {}))
    .catch(err => {
      console.error('Failed to load lock settings', err)
      // Return an empty object to try again later
      return {}
    })
}

function getBlockNumber() {
  return new Promise((resolve, reject) => app.web3Eth('getBlockNumber').subscribe(resolve, reject))
}

function marshallDate(date) {
  // Adjust for js time (in ms vs s)
  return parseInt(date, 10) * 1000
}
