import React from 'react'
import styled from 'styled-components'

import { useAragonApi } from '../../api-react'
import { Bar, Button, DropDown, GU, IconPlus, Tag } from '@aragon/ui'

import { Budget } from '../Card'
import { usePanel } from '../../context/Panel'

function AllBudgetsLabel() {
  const { appState: { budgets } } = useAragonApi()
  return (
    <div css="display: flex; align-items: center">
      <span css={{ marginRight: GU }}>All budgets</span>
      <Tag limitDigits={4} label={budgets.length} size="small" />
    </div>
  )
}

const statusOptions = [
  <AllBudgetsLabel key="1" />,
  'Active',
  'Inactive',
]

// always make sure `token` is loaded correctly
const statusFilters = [
  budget => budget.token, // all
  budget => budget.token && budget.active, // active
  budget => budget.token && !budget.active, // inactive
]

const Budgets = () => {
  const { appState } = useAragonApi()
  const [ status, setStatus ] = React.useState(0)
  const budgets = appState.budgets.filter(statusFilters[status])
  const { newBudget } = usePanel()

  return (
    <>
      <Bar
        primary={
          <DropDown
            selected={status}
            onChange={setStatus}
            items={statusOptions}
          />
        }
        secondary={
          <Button
            icon={<IconPlus />}
            label="New budget"
            mode="secondary"
            onClick={newBudget}
          />
        }
      />
      <StyledBudgets>
        {budgets.map(budget => (
          <Budget key={budget.id} budget={budget} />
        ))}
      </StyledBudgets>
    </>
  )
}

const StyledBudgets = styled.div`
  display: grid;
  grid-gap: ${2 * GU}px;
  grid-template-columns: repeat(auto-fill, minmax(${27 * GU}px, 1fr));
  margin-bottom: ${2 * GU}px;
`

export default Budgets
