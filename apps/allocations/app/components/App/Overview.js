import React from 'react'
import { useAragonApi } from '../../api-react'
import { Button, Header, IconPlus } from '@aragon/ui'

import { AllocationsHistory, Budgets, PeriodDetails } from '.'
import { usePanel } from '../../context/Panel'

const Overview = () => {
  const { appState } = useAragonApi()
  const { allocations = [] } = appState
  const { newAllocation } = usePanel()

  return (
    <>
      <Header
        primary="Allocations"
        secondary={
          <Button
            mode="strong"
            icon={<IconPlus />}
            onClick={() => newAllocation()}
            label="New allocation"
          />
        }
      />
      <PeriodDetails />
      <Budgets />
      { !!allocations.length && <AllocationsHistory allocations={allocations} /> }
    </>
  )
}

export default Overview
