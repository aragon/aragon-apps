import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'
import {
  ContextMenu,
  ContextMenuItem,
  DataView,
  IconView,
  Text,
} from '@aragon/ui'
import { isAfter } from 'date-fns'
import {
  ONE_TIME_DIVIDEND,
  RECURRING_DIVIDEND,
  ONE_TIME_MERIT,
  RECURRING,
  ONE_TIME,
  MERIT,
  DIVIDEND
} from '../../utils/constants'
import { Empty } from '../Card'
import Metrics from './Metrics'
import { displayCurrency } from '../../utils/helpers'

const Overview = ({
  rewards,
  newReward,
  viewReward,
  metrics,
}) => {
  const rewardsEmpty = rewards.length === 0

  if (rewardsEmpty) {
    return <Empty action={newReward} />
  }
  return (
    <OverviewMain>
      <RewardsWrap>
        <Metrics content={metrics} />
        <DataView
          heading={<Text size="xlarge">All rewards</Text>}
          fields={[ 'description', 'type', 'frequency', 'next payout', 'amount' ]}
          entries={rewards}
          renderEntry={renderReward}
          renderEntryActions={(reward) => renderMenu(reward, viewReward)}
        />
      </RewardsWrap>
    </OverviewMain>
  )
}

const renderMenu = (reward, viewReward) => (
  <ContextMenu>
    <StyledContextMenuItem
      onClick={() => viewReward(reward)}
    >
      <IconView css={{
        marginRight: '11px',
        marginBottom: '2px',
      }}/>
      <Text>View</Text>
    </StyledContextMenuItem>
  </ContextMenu>
)

const renderReward = (reward) => {
  let fields = []
  switch(reward.rewardType) {
  case ONE_TIME_DIVIDEND:
    fields = renderOneTimeDividend(reward)
    break
  case RECURRING_DIVIDEND:
    fields = renderRecurringDividend(reward)
    break
  case ONE_TIME_MERIT:
    fields = renderOneTimeMerit(reward)
    break
  }
  return fields
}

const renderOneTimeDividend = (reward) => {
  const {
    description,
    amount,
    amountToken,
    dateReference,
    endBlock,
  } = reward
  const nextPayout = isAfter(dateReference, new Date())
    ? dateReference.toDateString() + ` (block: ${endBlock})` : 'Completed'
  const displayAmount = `${displayCurrency(amount)} ${amountToken}`
  return [ description, DIVIDEND, ONE_TIME, nextPayout, displayAmount ]
}

const renderRecurringDividend = (reward) => {
  const {
    description,
    amount,
    amountToken,
    disbursement,
    disbursementUnit,
    disbursements,
    disbursementBlocks,
  } = reward
  const frequency = `${RECURRING} (${disbursement} ${disbursementUnit})`
  const today = new Date()
  const date = disbursements.find(d => d.getTime() > today.getTime())
  const block = disbursementBlocks[disbursements.indexOf(date)]
  const nextPayout = date === undefined
    ? 'Completed' : `${date.toDateString()} (block: ${block})`
  const displayAmount = `${displayCurrency(amount)} ${amountToken}`
  return [ description, DIVIDEND, frequency, nextPayout, displayAmount ]
}


const renderOneTimeMerit = (reward) => {
  const {
    description,
    amount,
    amountToken,
    endDate,
    endBlock,
  } = reward
  const nextPayout = isAfter(endDate, new Date())
    ? new Date(endDate).toDateString() + ` (block: ${endBlock})` : 'Completed'
  const displayAmount = `${displayCurrency(amount)} ${amountToken}`
  return [ description, MERIT, ONE_TIME, nextPayout, displayAmount ]
}

Overview.propTypes = {
  rewards: PropTypes.arrayOf(PropTypes.object).isRequired,
  newReward: PropTypes.func.isRequired,
  viewReward: PropTypes.func.isRequired,
  metrics: PropTypes.arrayOf(PropTypes.object).isRequired,
}

const OverviewMain = styled.div`
  background-color: #f8fcfd;
`
const RewardsWrap = styled.div`
  flex-grow: 1;
  > :not(:last-child) {
    margin-bottom: 20px;
  }
`
const StyledContextMenuItem = styled(ContextMenuItem)`
  padding: 8px 45px 8px 19px;
`

// eslint-disable-next-line import/no-unused-modules
export default Overview
