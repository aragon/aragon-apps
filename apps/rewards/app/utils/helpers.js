import PropTypes from 'prop-types'
import {
  ETH_DECIMALS,
  ETH_DECIMALS_NUMBER,
  RECURRING_DIVIDEND,
} from './constants'
import doubleCheck from '../assets/double-check.svg'
import BigNumber from 'bignumber.js'
import {
  GU,
  IconCheck,
  IconClock,
  Text,
  useTheme,
} from '@aragon/ui'
import React from 'react'

export const displayCurrency = (amount, decimalsNumber=ETH_DECIMALS_NUMBER) => {
  const decimals = BigNumber(10).pow(decimalsNumber)
  return BigNumber(amount).div(decimals).dp(3).toString()
}
export const toWei = amount => {
  return BigNumber(amount).times(ETH_DECIMALS).toNumber()
}

const IconDoubleCheck = () => <img src={doubleCheck} />

const types = {
  claimed: { icon: IconDoubleCheck, text: 'Claimed', color: 'positive' },
  ready: { icon: IconCheck, text: 'Ready to claim', color: 'positive' },
  pending: { icon: IconClock, text: 'Pending', color: 'warning' },
}

const Status = ({ type, time }) => {
  const theme = useTheme()
  const status = types[type]
  const text = status.text
  const Icon = status.icon
  const color = theme[status.color]
  const displayTime = time ? new Date(time * 1000).toLocaleString() : ''
  return (
    <div css='display: flex;'>
      <Icon style={{
        marginRight: 0.5 * GU + 'px',
        marginTop: -0.25 * GU + 'px',
        color: color,
      }} />
      <Text>
        {text} {displayTime}
      </Text>
    </div>
  )
}

Status.propTypes = {
  type: PropTypes.oneOf(Object.keys(types)).isRequired,
  time: PropTypes.string,
}

export const getStatus = ({
  rewardType,
  timeClaimed,
  endDate,
  claims,
  disbursements
}) => {
  if (rewardType === RECURRING_DIVIDEND) {
    if (claims === disbursements.length)
      return <Status type="claimed" time={timeClaimed} />
    if (Date.now() > disbursements[claims].getTime())
      return <Status type="ready" />
    return <Status type="pending" />
  }
  else {
    if (timeClaimed > 0)
      return <Status type="claimed" time={timeClaimed} />
    if (Date.now() > endDate)
      return <Status type="ready" />
    return <Status type="pending" />
  }
}
