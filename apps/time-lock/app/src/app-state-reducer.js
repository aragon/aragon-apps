import { hasLoadedLockSettings } from './lib/lock-settings'
import { BN } from 'bn.js'

function appStateReducer(state) {
  const ready = hasLoadedLockSettings(state)

  if (!ready) {
    return { ...state, ready }
  }

  const { locks, lockAmount, spamPenaltyFactor, pctBase } = state

  const pctBaseNum = parseInt(pctBase, 10)

  return {
    ...state,
    ready,
    lockAmount: new BN(lockAmount),

    spamPenaltyFactor: new BN(spamPenaltyFactor),
    pctBase: new BN(pctBase),

    numData: {
      spamPenaltyFactor: parseInt(spamPenaltyFactor, 10) / pctBaseNum,
      pctBase: pctBaseNum,
    },

    locks: locks
      ? locks.map(lock => ({
          lockAmount: new BN(lock.lockAmount),
          unlockTime: new Date(lock.unlockTime),
        }))
      : [],
  }
}

export default appStateReducer
