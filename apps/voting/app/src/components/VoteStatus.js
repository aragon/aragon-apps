import React from 'react'
import styled from 'styled-components'
import {
  IconCheck,
  IconCross,
  IconTime,
  GU,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { useSettings } from '../vote-settings-manager'
import {
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_REJECTED,
  VOTE_STATUS_ACCEPTED,
  VOTE_STATUS_ENACTED,
  VOTE_STATUS_PENDING_ENACTMENT,
} from '../vote-types'
import { getVoteStatus } from '../vote-utils'

const getStatusAttributes = (status, theme) => {
  if (status === VOTE_STATUS_ONGOING) {
    return {
      label: 'Ongoing',
      Icon: IconTime,
      color: null,
    }
  }
  if (status === VOTE_STATUS_REJECTED) {
    return {
      label: 'Rejected',
      Icon: IconCross,
      color: theme.negative,
    }
  }
  if (status === VOTE_STATUS_ACCEPTED) {
    return {
      label: 'Passed',
      Icon: IconCheck,
      color: theme.positive,
    }
  }
  if (status === VOTE_STATUS_PENDING_ENACTMENT) {
    return {
      label: 'Passed (pending)',
      Icon: IconCheck,
      color: theme.positive,
    }
  }
  if (status === VOTE_STATUS_ENACTED) {
    return {
      label: 'Passed (enacted)',
      Icon: IconCheck,
      color: theme.positive,
    }
  }
}

const VoteStatus = ({ vote }) => {
  const theme = useTheme()
  const { pctBase } = useSettings()
  const status = getVoteStatus(vote, pctBase)
  const { Icon, color, label } = getStatusAttributes(status, theme)

  return (
    <Main
      css={`
        ${textStyle('body2')};
        color: ${color || theme.surfaceContentSecondary};
      `}
    >
      {Icon && <Icon size="small" />}
      <StatusLabel spaced={Boolean(Icon)}>{label}</StatusLabel>
    </Main>
  )
}

const Main = styled.span`
  display: flex;
  align-items: center;
`

const StatusLabel = styled.span`
  margin-left: ${({ spaced }) => (spaced ? `${0.5 * GU}px` : '0')};
`

export default VoteStatus
