import React from 'react'
import { Split } from '@aragon/ui'
import { useAppState } from '@aragon/api-react'

import LockTable from '../components/LockTable'
import InfoBoxes from '../components/InfoBoxes'

const Locks = React.memo(({ locks }) => {
  const {
    lockAmount,
    lockDuration,
    numData,
    tokenAddress,
    tokenName,
    tokenSymbol,
    tokenDecimals,
  } = useAppState()

  return (
    <Split
      primary={<LockTable locks={locks} tokenSymbol={tokenSymbol} tokenDecimals={tokenDecimals} />}
      secondary={
        <InfoBoxes
          amount={lockAmount}
          duration={lockDuration}
          spamPenaltyFactor={numData.spamPenaltyFactor}
          tokenName={tokenName}
          tokenAddress={tokenAddress}
          tokenSymbol={tokenSymbol}
          tokenDecimals={tokenDecimals}
        />
      }
    />
  )
})

export default Locks
