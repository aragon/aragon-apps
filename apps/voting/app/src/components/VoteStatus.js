import React from 'react'
import styled from 'styled-components'
import { textStyle, useTheme, IconTime, IconCross, IconCheck } from '@aragon/ui'
import { useSettings } from '../vote-settings-manager'
import {
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
  VOTE_STATUS_EXECUTED,
  VOTE_STATUS_PENDING_ENACTMENT,
} from '../vote-types'
import { isVoteAction, getVoteStatus } from '../vote-utils'

const POSITIVE = Symbol('positive')
const NEGATIVE = Symbol('negative')

const ATTRIBUTES = {
  [VOTE_STATUS_PENDING_ENACTMENT]: {
    label: 'Pending',
    Icon: IconCheck,
    color: POSITIVE,
  },
  [VOTE_STATUS_ONGOING]: {
    label: 'Ongoing',
    Icon: IconTime,
    color: null,
  },
  [VOTE_STATUS_ACCEPTED]: {
    label: 'Passed',
    Icon: IconCheck,
    color: POSITIVE,
  },
  [VOTE_STATUS_REJECTED]: {
    label: 'Rejected',
    Icon: IconCross,
    color: NEGATIVE,
  },
  [VOTE_STATUS_EXECUTED]: {
    label: 'Enacted',
    Icon: IconCheck,
    color: POSITIVE,
  },
}

const VoteStatus = ({ cardStyle, vote }) => {
  const theme = useTheme()
  const { pctBase } = useSettings()
  const status = getVoteStatus(vote, pctBase)
  const { Icon, color, label } = ATTRIBUTES[
    status === VOTE_STATUS_ACCEPTED &&
    (isVoteAction(vote) && !vote.data.executed)
      ? VOTE_STATUS_PENDING_ENACTMENT
      : status
  ]

  return (
    <Main
      css={`
        ${textStyle('body2')};
        color: ${color === POSITIVE
          ? theme.positive
          : color === NEGATIVE
          ? theme.negative
          : theme.textTertiary};
      `}
    >
      {Icon && <Icon size="tiny" />}
      <StatusLabel spaced={Boolean(Icon)}>{label}</StatusLabel>
    </Main>
  )
}

const Main = styled.span`
  display: flex;
  align-items: center;
  color: ${({ color }) => color};
  font-size: ${({ fontSize }) => fontSize}px;
  font-weight: ${({ fontWeight }) => fontWeight};
`

const StatusLabel = styled.span`
  margin-left: ${({ spaced }) => (spaced ? '5px' : '0')};
`

export default VoteStatus
