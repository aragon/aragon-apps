import React from 'react'
import styled from 'styled-components'
import { theme, IconTime, IconCross, IconCheck } from '@aragon/ui'

const STATUSES = {
  ongoing: { label: 'Ongoing', Icon: IconTime, color: theme.textSecondary },
  approved: { label: 'Approved', Icon: IconCheck, color: theme.positive },
  rejected: { label: 'Rejected', Icon: IconCross, color: theme.negative },
}

const getStatus = (votesYea, votesNay, support, quorum, opened) => {
  if (!opened && votesYea === 0 && votesNay === 0) {
    return STATUSES.rejected
  }

  if (opened) return STATUSES.timeout
  if (votesYea === 0 && votesNay === 0) return STATUSES.timeout
  if (votesYea >= votesNay) return STATUSES.approved
  return STATUSES.rejected
}

const Status = ({ votesYea, votesNay, quorum, opened }) => {
  const status = getStatus(votesYea, votesNay, quorum, opened)
  const { color, label, Icon } = status
  return opened && status === STATUSES.timeout ? null : (
    <Main color={color}>
      <Icon />
      <StatusLabel>{label}</StatusLabel>
    </Main>
  )
}

Status.defaultProps = {
  votesYea: 0,
  votesNay: 0,
  opened: true,
  quorum: 0,
}

const Main = styled.span`
  font-weight: 600;
  white-space: nowrap;
  color: ${({ color }) => color};
`

const StatusLabel = styled.span`
  margin-left: 10px;
`

export default Status
