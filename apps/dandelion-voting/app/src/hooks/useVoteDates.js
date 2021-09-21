import { useState, useMemo, useEffect } from 'react'
import { useApi } from '@aragon/api-react'
import { loadBlockTimestamp } from '../web3-utils'

function getBlocks(votes) {
  if (!votes) {
    return []
  }

  const blockSet = new Set(votes.reduce((blocks, vote) => {
    blocks.add(vote.data.startBlock)
    blocks.add(vote.data.endBlock)
    return blocks
  }, new Set()))

  return Array.from(blockSet)
}

export function useVoteDates(votes) {
  const api = useApi()
  const [blockDates, setBlockDates] = useState()
  const blocks = useMemo(() => getBlocks(votes), [votes])

  useEffect(() => {
    let cancel = false

    async function getBlockTime() {
      const dates = await Promise.all(blocks.map(async block => {
        let blockDate = null
        try {
          blockDate = new Date(await loadBlockTimestamp(api, block))
        }
        catch(_) {}
        return [block, blockDate]
      }))

      if (!cancel) {
        setBlockDates(new Map(dates))
      }
    }

    getBlockTime()

    return () => {
      cancel = true
    }
  }, [blocks])

  return blockDates
}
