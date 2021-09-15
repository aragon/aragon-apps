import BN from 'bn.js'

export function isUnlocked(unlockTime, now) {
  return unlockTime <= now
}

export function reduceTotal(locks) {
  return locks.reduce((acc, lock) => acc.add(lock.lockAmount), new BN(0))
}

export function lockReducer(state, action) {
  switch (action.type) {
    case 'SET_COUNT':
      return { ...state, value: action.value }
    case 'SET_MAX':
      return { ...state, max: action.max }
    default:
      throw new Error('Unexpected action')
  }
}
