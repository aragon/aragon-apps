import React from 'react'
import styled from 'styled-components'
import { useAragonApi } from '../../api-react'
import { Button, EmptyStateCard, GU, LoadingRing } from '@aragon/ui'
import emptyState from '../../assets/no-budgets.svg'
import { usePanel } from '../../context/Panel'

const illustration = <img src={emptyState} alt="No budgets" height="160" />

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: calc(100vh - ${14 * GU}px);
`

export default function Empty() {
  const { appState: { isSyncing } } = useAragonApi()
  const { newBudget } = usePanel()

  return (
    <Wrapper>
      <EmptyStateCard
        text={
          isSyncing ? (
            <div
              css={`
                display: grid;
                align-items: center;
                justify-content: center;
                grid-template-columns: auto auto;
                grid-gap: ${1 * GU}px;
              `}
            >
              <LoadingRing />
              <span>Syncing…</span>
            </div>
          ) : (
            'No budgets here'
          )}

        illustration={illustration}
        action={
          <Button onClick={newBudget}>New budget</Button>
        }
      />
    </Wrapper>
  )
}
