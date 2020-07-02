import React from 'react'
import {
  GU,
  IconAttention,
  IconClock,
  IconClosed,
  IconInfo,
  Tag,
  textStyle,
  useTheme,
} from '@aragon/ui'
import {
  VOTE_STATUS_PAUSED,
  VOTE_STATUS_ACTIVE,
  VOTE_STATUS_CANCELLED,
  VOTE_STATUS_CLOSED,
  DISPUTABLE_VOTE_STATUSES,
} from '../disputable-vote-statuses'

const getStatusAttributes = (status, theme) => {
  if (status === VOTE_STATUS_PAUSED) {
    return {
      background: theme.warningSurface,
      label: 'Challenged',
      Icon: IconAttention,
      color: theme.warningSurfaceContent,
    }
  }
  if (status === VOTE_STATUS_CANCELLED) {
    return {
      background: theme.surfaceUnder,
      label: 'Cancelled',
      Icon: IconClosed,
      color: theme.disabledContent,
    }
  }
  if (status === VOTE_STATUS_CLOSED) {
    return {
      background: theme.surfaceUnder,
      label: 'Closed',
      Icon: IconInfo,
      color: theme.disabledContent,
    }
  }

  if (status === VOTE_STATUS_ACTIVE) {
    return {
      background: null,
      label: 'Scheduled',
      Icon: IconClock,
      color: null,
    }
  }
  return {
    background: null,
    label: '',
    Icon: null,
    color: null,
  }
}

function DisputableStatusLabel({ status }) {
  const theme = useTheme()
  const { Icon, background, color, label } = getStatusAttributes(status, theme)

  return (
    <Tag
      background={background}
      color={color}
      mode="indicator"
      label={label}
      icon={<Icon size="small" />}
    />
  )
}

export default DisputableStatusLabel
