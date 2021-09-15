import React from 'react'

import { DataView, Text, Countdown } from '@aragon/ui'
import Balance from './Balance'

import { formatTokenAmount, toHours } from '../lib/math-utils'
import { reduceTotal } from '../lib/lock-utils'
import NoLocks from '../screens/NoLocks'

const PAGINATION = 10

const useLocks = locks => {
  const unlocked = locks.filter(l => l.unlocked)
  const totalUnlocked = reduceTotal(unlocked)

  const locked = locks.filter(l => !unlocked.includes(l))
  const totalLocked = reduceTotal(locked)

  return { totalUnlocked, locked, totalLocked }
}

const renderUnlockTime = unlockTime => {
  const now = new Date()
  const end = new Date(unlockTime)
  const removeDaysAndHours = toHours(end - now) < 1
  return <Countdown end={end} removeDaysAndHours={removeDaysAndHours} />
}

const LockTable = React.memo(({ locks, tokenSymbol, tokenDecimals }) => {
  const { totalUnlocked, locked } = useLocks(locks)

  return (
    <>
      <Balance total={totalUnlocked} tokenDecimals={tokenDecimals} tokenSymbol={tokenSymbol} />
      {locked.length > 0 ? (
        <DataView
          fields={['Amount', 'Unlocks in']}
          entries={locked.map(l => [l.lockAmount, l.unlockTime])}
          renderEntry={([amount, unlockTime]) => [
            <Text>{`${formatTokenAmount(amount, false, tokenDecimals)} ${tokenSymbol}`}</Text>,
            renderUnlockTime(unlockTime),
          ]}
          mode="table"
          entriesPerPage={PAGINATION}
        />
      ) : (
        <NoLocks />
      )}
    </>
  )
})

export default LockTable
