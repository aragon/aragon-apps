import React from 'react'
import styled from 'styled-components'
import {
  ContextMenu,
  ContextMenuItem,
  IconEdit,
  IconProhibited,
  useTheme,
} from '@aragon/ui'
import { usePanel } from '../context/Panel'
import * as types from '../utils/prop-types'
import useSaveBudget from '../hooks/useSaveBudget'

const ActionLabel = styled.span`
  margin-left: 15px;
`

export default function BudgetContextMenu({ budget }) {
  const { editBudget } = usePanel()
  const saveBudget = useSaveBudget()
  const theme = useTheme()

  const deactivate = React.useCallback(() => {
    saveBudget({
      id: budget.id,
      amount: 0,
      name: budget.name,
    })
  }, [])

  return (
    <ContextMenu>
      <ContextMenuItem onClick={() => editBudget(budget)}>
        <IconEdit color={theme.surfaceIcon} />
        <ActionLabel>{budget.active ? 'Edit' : 'Reactivate'}</ActionLabel>
      </ContextMenuItem>
      {budget.active && (
        <ContextMenuItem onClick={deactivate}>
          <IconProhibited color={theme.surfaceIcon} />
          <ActionLabel>Deactivate</ActionLabel>
        </ContextMenuItem>
      )}
    </ContextMenu>
  )
}

BudgetContextMenu.propTypes = {
  budget: types.budget.isRequired,
}
