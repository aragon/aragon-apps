import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import {
  Box,
  Text,
  useTheme,
  GU,
  Link,
} from '@aragon/ui'
import { formatDistance } from 'date-fns'
import { usePanelManagement } from '../../Panel'
import { Avatar } from '../../Panel/PanelComponents'
import { issueShape, userGitHubShape } from '../../../utils/shapes.js'

const calculateAgo = pastDate => formatDistance(pastDate, Date.now(), { addSuffix: true })

const IssueEvent = ({ user, ...props }) => {
  const theme = useTheme()

  return (
    <IssueEventMain>
      <div css="display: flex">
        <Avatar user={user} />
        <IssueEventDetails>
          <Text.Block size="small">
            {props.eventDescription}
          </Text.Block>
          <Text.Block size="xsmall" color={`${theme.surfaceContentSecondary}`}>
            {calculateAgo(props.date)}
          </Text.Block>
        </IssueEventDetails>
      </div>
      {props.eventAction && (
        <div css="margin-top: 8px">
          {props.eventAction}
        </div>
      )}
    </IssueEventMain>
  )
}

IssueEvent.propTypes = {
  user: userGitHubShape,
  eventDescription: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.object,
  ]).isRequired,
  eventAction: PropTypes.object,
  date: PropTypes.string.isRequired,
}

const applicationLink = (user, onReviewApplication, issue, requestIndex) => (
  <React.Fragment>
    {user} submitted <Link onClick={() =>
      onReviewApplication({ issue, requestIndex, readOnly: true })
    }>an application for review</Link>
  </React.Fragment>
)

const workLink = (user, onReviewWork, issue, submissionIndex) => (
  <React.Fragment>
    {user} submitted <Link onClick={() =>
      onReviewWork({ issue, submissionIndex, readOnly: true })
    }>work for review</Link>
  </React.Fragment>
)

const activities = (
  issue,
  createdAt,
  requestsData,
  workSubmissions,
  fundingHistory,
  onReviewApplication,
  onReviewWork
) => {
  const events = {
    createdAt: {
      date: createdAt,
      user: issue.author,
      eventDescription: issue.author.login + ' opened this issue'
    }
  }

  if (requestsData) {
    requestsData.forEach((data, index) => {
      events[data.applicationDate] = {
        date: data.applicationDate,
        user: data.user,
        eventDescription: applicationLink(data.user.login, onReviewApplication, issue, index),
      }

      if ('review' in data) {
        events[data.review.reviewDate] = {
          date: data.review.reviewDate,
          user: data.user,
          eventDescription: (
            data.user.login + (data.review.approved ?
              ' was assigned to this task'
              :
              '\'s application was rejected'
            )
          ),
        }
      }
    })
  }

  if (workSubmissions) {
    workSubmissions.forEach((data, submissionIndex) => {
      events[data.submissionDate] = {
        date: data.submissionDate,
        user: data.user,
        eventDescription: workLink(data.user.login, onReviewWork, issue, submissionIndex),
      }

      if ('review' in data) {
        events[data.review.reviewDate] = {
          date: data.review.reviewDate,
          user: data.user,
          eventDescription: (
            data.user.login + (data.review.accepted ?
              '\'s work was accepted'
              :
              '\'s work was rejected'
            )
          ),
        }
      }
    })
  }

  if (fundingHistory) {
    fundingHistory.forEach((data, i) => {
      events[data.date] = {
        date: data.date,
        user: data.user,
        eventDescription: data.user.login + (i ? ' updated the' : ' placed a') + ' bounty',
      }
    })
  }

  return events
}

const EventsCard = ({ issue }) => {
  const theme = useTheme()
  const { reviewApplication, reviewWork } = usePanelManagement()
  const issueEvents = activities(
    issue,
    issue.createdAt,
    issue.requestsData,
    issue.workSubmissions,
    issue.fundingHistory,
    reviewApplication,
    reviewWork
  )

  return (
    <Box
      heading="Activity"
      padding={0}
      css={`
        > :first-child {
          padding: ${2 * GU}px;
        }
      `}
    >
      <div css={`
        > :not(:last-child) {
          border-bottom: 1px solid ${theme.border};
        }
      `}>
        {Object.keys(issueEvents).length > 0 ? (
          Object.keys(issueEvents)
            .sort((a, b) => new Date(a) - new Date(b))
            .map((eventDate, i) => {
              return <IssueEvent key={i} user={issueEvents[eventDate].user} {...issueEvents[eventDate]} />
            })
        ) : (
          <IssueEventMain>
              This issue has no activity
          </IssueEventMain>
        )
        }
      </div>
    </Box>
  )
}

EventsCard.propTypes = {
  issue: issueShape,
}

const IssueEventMain = styled.div`
  display: flex;
  flex-direction: column;
  padding: ${3 * GU}px;
`
const IssueEventDetails = styled.div`
  > :not(:last-child) {
    margin-bottom: ${GU}px;
  }
`

// eslint-disable-next-line import/no-unused-modules
export default EventsCard
