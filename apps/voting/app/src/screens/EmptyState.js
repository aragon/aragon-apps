import React from 'react'
import styled from 'styled-components'
import { EmptyStateCard } from '@aragon/ui'
import emptyIcon from '../assets/empty-card-icon.svg'

const EmptyState = ({ onActivate }) => (
  <Main>
    <EmptyStateCard
      title="There are no votes yet"
      text="Create a new vote to get started."
      actionText="New vote"
      icon={<img src={emptyIcon} alt="" />}
      onActivate={onActivate}
    />
  </Main>
)

const Main = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-grow: 1;
`

export default EmptyState
