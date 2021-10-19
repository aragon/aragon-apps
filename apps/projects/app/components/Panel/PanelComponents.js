import React from 'react'
import styled from 'styled-components'
import PropTypes from 'prop-types'
import { Button, GU, IconCheck, IconCross, Link, Text, useTheme } from '@aragon/ui'
import { IconGitHub } from '../Shared'
import { issueShape } from '../../utils/shapes.js'
import { format as formatDate } from 'date-fns'

export const IssueTitleLink = ({ issue }) => {
  const theme = useTheme()

  return (
    <IssueLinkRow>
      <div css={`margin-top: ${.5 * GU}px`}>
        <IconGitHub
          color={`${theme.surfaceContentSecondary}`}
          width="16px"
          height="16px"
        />
      </div>
      <Link
        href={issue.url}
        target="_blank"
        style={{ textDecoration: 'none' }}
      >
        <Text css="margin-left: 6px" color={`${theme.link}`}>
          {issue.repo} #{issue.number}
        </Text>
      </Link>
    </IssueLinkRow>
  )
}
IssueTitleLink.propTypes = issueShape

export const IssueTitle = ({ issue }) => (
  <div>
    <IssueText>
      <Text css='font-size: 18px;'>{issue.title}</Text>
    </IssueText>
    <IssueTitleLink issue={issue} />
  </div>
)
IssueTitle.propTypes = issueShape

export const Avatar = ({ user }) => {
  const theme = useTheme()

  return (
    <Link
      href={user.url}
      target="_blank"
      css={`text-decoration: none; color: ${theme.link}; margin-right: ${.7 * GU}px`}
    >
      <img
        alt=""
        src={user.avatarUrl}
        css="width: 40px; height: 40px; margin-right: 10px; border-radius: 50%;"
      />
    </Link>
  )
}
Avatar.propTypes = {
  user: PropTypes.shape({
    url: PropTypes.string.isRequired,
    avatarUrl: PropTypes.string.isRequired,
  }).isRequired,
}

const statuses = [
  { color: 'negative', text: 'Rejected' },
  { color: 'positive', text: 'Accepted' },
]

export const Status = ({ reviewDate, approved }) => {
  const theme = useTheme()
  const status = statuses[Number(approved)]
  const text = status.text
  const color = theme[status.color]
  return (
    <div css="display: flex; align-items: center">
      <IconCheck color={color} css={`margin-top: -${0.5 * GU}px; margin-right: ${GU}px`} />
      <Text color={`${color}`}>{text}</Text>
      <Text color={`${theme.contentSecondary}`} css={`margin-left: ${GU}px`}>
        {formatDate(new Date(reviewDate), 'd MMM yy, h:MM a (z)')}
      </Text>
    </div>
  )
}
Status.propTypes = {
  approved: PropTypes.bool.isRequired,
  reviewDate: PropTypes.string.isRequired,
}

export const ReviewButtons = ({ onAccept, onReject, disabled }) => (
  <ReviewRow>
    <ReviewButton
      disabled={disabled}
      mode="negative"
      onClick={onReject}
      icon={<IconCross />}
      label="Reject"
    />
    <ReviewButton
      disabled={disabled}
      mode="positive"
      onClick={onAccept}
      icon={<IconCheck />}
      label="Accept"
    />
  </ReviewRow>
)
ReviewButtons.propTypes = {
  onAccept: PropTypes.func.isRequired,
  onReject: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
}
const ReviewRow = styled.div`
  display: flex;
  margin-bottom: 8px;
  justify-content: space-between;
`
const ReviewButton = styled(Button)`
  width: 48%;
`
const IssueLinkRow = styled.div`
  height: 31px;
  display: flex;
  align-items: center;
  margin-bottom: ${1.5 * GU}px;
`
export const FieldText = styled.div`
  margin: ${0.5 * GU}px 0 ${2 * GU}px;
`
export const UserLink = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: ${2 * GU}px;
`
export const IssueText = styled.div`
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`
export const SubmissionDetails = styled.div`
  border: 1px solid ${p => p.border};
  background-color: ${p => p.background};
  padding: ${3 * GU}px;
  margin-bottom: ${2 * GU}px;
  border-radius: 3px;
`
