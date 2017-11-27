import React from 'react'
import { EmptyStateCard } from '@aragon/ui'

import icon from './assets/icon.svg'

const EmptyGroupCard = ({ groupName, onActivate }) => (
  <EmptyStateCard
    actionText="Add"
    icon={icon}
    onActivate={onActivate}
    text={`Add Entity to the Group ${groupName}.`}
  />
)

export default EmptyGroupCard
