import React from 'react'
import PropTypes from 'prop-types'
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
import { DISPUTABLE_VOTE_STATUSES } from '../disputable-vote-statuses'

function DisputableStatusLabel({ status }) {
  const theme = useTheme()
  const statusAttributes = new Map([
    [
      DISPUTABLE_VOTE_STATUSES.get('Active'),
      {
        background: null,
        label: 'Scheduled',
        Icon: IconClock,
        color: null,
      },
    ],
    [
      DISPUTABLE_VOTE_STATUSES.get('Cancelled'),
      {
        background: String(theme.surfaceUnder),
        label: 'Cancelled',
        Icon: IconClosed,
        color: String(theme.disabledContent),
      },
    ],
    [
      DISPUTABLE_VOTE_STATUSES.get('Closed'),
      {
        background: String(theme.surfaceUnder),
        label: 'Closed',
        Icon: IconInfo,
        color: String(theme.disabledContent),
      },
    ],
    [
      DISPUTABLE_VOTE_STATUSES.get('Paused'),
      {
        background: String(theme.warningSurface),
        label: 'Challenged',
        Icon: IconAttention,
        color: String(theme.warningSurfaceContent),
      },
    ],
  ])

  const { Icon, background, color, label } = statusAttributes.get(status)

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

DisputableStatusLabel.propTypes = {
  status: PropTypes.oneOf([
    DISPUTABLE_VOTE_STATUSES.get('Active'),
    DISPUTABLE_VOTE_STATUSES.get('Cancelled'),
    DISPUTABLE_VOTE_STATUSES.get('Closed'),
    DISPUTABLE_VOTE_STATUSES.get('Paused'),
  ]),
}

export default DisputableStatusLabel
