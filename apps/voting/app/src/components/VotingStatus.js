import React from 'react'
import styled from 'styled-components'
import { theme, IconTime, IconCross, IconCheck } from '@aragon/ui'

const STATUSES = {
  timeout: { label: 'Time out', Icon: IconTime, color: theme.textSecondary },
  approved: { label: 'Approved', Icon: IconCheck, color: theme.positive },
  rejected: { label: 'Rejected', Icon: IconCross, color: theme.negative },
}

const getStatus = (votesYes, votesNo) => {
  if (votesYes === 0 && votesNo === 0) return STATUSES.timeout
  if (votesYes >= votesNo) return STATUSES.approved
  return STATUSES.rejected
}

const Status = ({ votesYes, votesNo, opened }) => {
  const status = getStatus(votesYes, votesNo)
  const { color, label, Icon } = status
  return opened && status === STATUSES.timeout ? null : (
    <Main color={color}>
      <Icon />
      <StatusLabel>{label}</StatusLabel>
    </Main>
  )
}

Status.defaultProps = {
  votesYes: 0,
  votesNo: 0,
  opened: true,
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
