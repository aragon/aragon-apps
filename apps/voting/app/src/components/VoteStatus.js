import React from 'react'
import styled from 'styled-components'
import { theme, IconTime, IconCross, IconCheck } from '@aragon/ui'
import {
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
} from '../vote-types'
import { getVoteStatus } from '../vote-utils'

const ATTRIBUTES = {
  [VOTE_STATUS_ONGOING]: {
    label: 'Ongoing',
    Icon: IconTime,
    color: theme.textSecondary,
  },
  [VOTE_STATUS_ACCEPTED]: {
    label: 'Approved',
    Icon: IconCheck,
    color: theme.positive,
  },
  [VOTE_STATUS_REJECTED]: {
    label: 'Rejected',
    Icon: IconCross,
    color: theme.negative,
  },
}

const VoteStatus = ({ vote: { data, support, quorum } }) => {
  const status = getVoteStatus(data, support, quorum)
  const { color, label, Icon } = ATTRIBUTES[status]
  return (
    <Main color={color}>
      <Icon />
      <StatusLabel>{label}</StatusLabel>
    </Main>
  )
}

const Main = styled.span`
  font-weight: 600;
  white-space: nowrap;
  color: ${({ color }) => color};
`

const StatusLabel = styled.span`
  margin-left: 10px;
`

export default VoteStatus
