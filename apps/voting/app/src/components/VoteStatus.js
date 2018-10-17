import React from 'react'
import styled from 'styled-components'
import { theme, IconTime, IconCross, IconCheck } from '@aragon/ui'
import provideSettings from '../utils/provideSettings'
import {
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
  VOTE_STATUS_EXECUTED,
} from '../vote-types'
import { getVoteStatus } from '../vote-utils'

const ATTRIBUTES = {
  [VOTE_STATUS_ONGOING]: {
    label: 'Ongoing',
    Icon: IconTime,
    color: theme.textTertiary,
    bold: false,
  },
  [VOTE_STATUS_ACCEPTED]: {
    label: 'Pending execution',
    Icon: null,
    color: theme.textTertiary,
    bold: false,
  },
  [VOTE_STATUS_REJECTED]: {
    label: 'Rejected',
    Icon: IconCross,
    color: theme.negative,
    bold: true,
  },
  [VOTE_STATUS_EXECUTED]: {
    label: 'Executed',
    Icon: IconCheck,
    color: theme.positive,
    bold: true,
  },
}

const VoteStatus = ({ cardStyle, settings, vote }) => {
  const status = getVoteStatus(vote, settings.pctBase)
  const { label, Icon, color, bold } = ATTRIBUTES[status]
  return (
    <Main
      fontSize={cardStyle ? 13 : 15}
      fontWeight={cardStyle || !bold ? 400 : 600}
      color={cardStyle ? theme.textTertiary : color}
    >
      {Icon && <Icon />}
      <StatusLabel spaced={Boolean(Icon)}>{label}</StatusLabel>
    </Main>
  )
}

const Main = styled.span`
  white-space: nowrap;
  color: ${({ color }) => color};
  font-size: ${({ fontSize }) => fontSize}px;
  font-weight: ${({ fontWeight }) => fontWeight};
`

const StatusLabel = styled.span`
  margin-left: ${({ spaced }) => (spaced ? '5px' : '0')};
`

export default provideSettings(VoteStatus)
