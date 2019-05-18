import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

const SYNC_STATUS_INITIALIZING = Symbol('SYNC_STATUS_INITIALIZING')
const SYNC_STATUS_SYNCING = Symbol('SYNC_STATUS_SYNCING')
const SYNC_STATUS_READY = Symbol('SYNC_STATUS_READY')

const SYNC_STATUSES = [
  SYNC_STATUS_INITIALIZING,
  SYNC_STATUS_SYNCING,
  SYNC_STATUS_READY,
]

function useSyncStatus() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setTimeout(() => {
      if (index < SYNC_STATUSES.length - 1) {
        setIndex(v => v + 1)
      }
    }, 2000)

    return () => clearTimeout(id)
  }, [index])

  return SYNC_STATUSES[index]
}

const SyncStatusType = PropTypes.oneOf([
  SYNC_STATUS_INITIALIZING,
  SYNC_STATUS_READY,
  SYNC_STATUS_SYNCING,
])

export {
  SYNC_STATUS_INITIALIZING,
  SYNC_STATUS_READY,
  SYNC_STATUS_SYNCING,
  SyncStatusType,
  useSyncStatus,
}
