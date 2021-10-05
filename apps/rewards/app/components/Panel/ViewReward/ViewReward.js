import React from 'react'
import RewardSummary from '../RewardSummary'
import { Text, useTheme } from '@aragon/ui'
import { getStatus } from '../../../utils/helpers'
import Header from '../../Styles/Header'

const ViewReward = ({ reward, isMyReward }) => {
  const theme = useTheme()
  return (
    <div>
      <RewardSummary
        reward={reward}
        theme={theme}
      />
      {isMyReward && (
        <div>
          <Header>status</Header>
          <Text>{ getStatus(reward) }</Text>
        </div>
      )}
    </div>
  )
}

export default ViewReward
