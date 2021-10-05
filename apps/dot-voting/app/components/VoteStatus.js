import React from 'react'
import PropTypes from 'prop-types'
import { useAragonApi } from '../api-react'
import { IconCheck, IconCross, IconTime, useTheme } from '@aragon/ui'
import {
  VOTE_STATUS_EXECUTED,
  VOTE_STATUS_FAILED,
  VOTE_STATUS_ONGOING,
  VOTE_STATUS_SUCCESSFUL
} from '../utils/vote-types'
import { getVoteStatus } from '../utils/vote-utils'

const VoteStatus = ({ vote }) => {
  const theme = useTheme()
  const { appState: { globalMinQuorum = 0 } } = useAragonApi()
  const status = getVoteStatus(vote, globalMinQuorum)

  const ATTRIBUTES = {
    [VOTE_STATUS_ONGOING]: {
      label: 'Ongoing',
      Icon: IconTime,
      color: theme.textSecondary,
    },
    [VOTE_STATUS_SUCCESSFUL]: {
      label: 'Passed (pending)',
      Icon: IconCheck,
      color: theme.positive,
    },
    [VOTE_STATUS_EXECUTED]: {
      label: 'Passed (enacted)',
      Icon: IconCheck,
      color: theme.positive,
    },
    [VOTE_STATUS_FAILED]: {
      label: 'Rejected',
      Icon: IconCross,
      color: theme.negative,
    },
  }

  const { color, label, Icon } = ATTRIBUTES[status]

  return (
    <div css={`
        display: flex;
        color: ${color}
      `}
    >
      <Icon width="13px" />
      <span css="margin-left: 10px; padding-top: 2px">{label}</span>
    </div>
  )
}

VoteStatus.propTypes = {
  vote: PropTypes.object.isRequired,
}

export default VoteStatus
