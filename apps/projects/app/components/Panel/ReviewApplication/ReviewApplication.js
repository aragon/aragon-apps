import React, { useState } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { format as formatDate, formatDistance } from 'date-fns'
import {
  DropDown,
  GU,
  Text,
  TextInput,
  useTheme,
} from '@aragon/ui'
import { FormField, FieldTitle } from '../../Form'
import useGithubAuth from '../../../hooks/useGithubAuth'
import { useAragonApi } from '../../../api-react'
import { usePanelManagement } from '../../Panel'
import { ipfsAdd } from '../../../utils/ipfs-helpers'
import { toHex } from 'web3-utils'
import { issueShape } from '../../../utils/shapes.js'
import { DetailHyperText } from '../../../../../../shared/ui'
import {
  Avatar,
  FieldText,
  IssueTitle,
  ReviewButtons,
  Status,
  SubmissionDetails,
  UserLink,
} from '../PanelComponents'

const ReviewApplication = ({ issue, requestIndex, readOnly }) => {
  const githubCurrentUser = useGithubAuth()
  const {
    api: { reviewApplication },
  } = useAragonApi()
  const { closePanel } = usePanelManagement()
  const theme = useTheme()

  const [ feedback, setFeedback ] = useState('')
  const [ index, setIndex ] = useState(requestIndex)

  const updateFeedback = e => setFeedback(e.target.value)

  const buildReturnData = approved => {
    const today = new Date()
    return {
      feedback,
      approved,
      user: githubCurrentUser,
      reviewDate: today.toISOString(),
    }
  }

  const onAccept = () => onReviewApplication(true)
  const onReject = () => onReviewApplication(false)
  const changeRequest = (index) => setIndex(index)

  const onReviewApplication = async (approved) => {
    closePanel()
    const review = buildReturnData(approved)
    // new IPFS data is old data plus state returned from the panel
    const ipfsData = issue.requestsData[index]
    const requestIPFSHash = await ipfsAdd({ ...ipfsData, review })

    reviewApplication(
      toHex(issue.repoId),
      issue.number,
      issue.requestsData[index].contributorAddr,
      requestIPFSHash,
      approved
    ).toPromise()
  }

  const request = issue.requestsData[index]
  const application = {
    user: {
      login: request.user.login,
      name: request.user.name,
      avatarUrl: request.user.avatarUrl,
      url: request.user.url
    },
    workplan: request.workplan,
    hours: request.hours,
    eta: (request.eta === '-') ? request.eta : formatDate(new Date(request.eta), 'MMM d'),
    applicationDate: request.applicationDate
  }

  const applicant = application.user
  const applicantName = applicant.name ? applicant.name : applicant.login
  const applicationDateDistance = formatDistance(new Date(application.applicationDate), new Date())

  return (
    <div css={`margin: ${2 * GU}px 0`}>
      <IssueTitle issue={issue} />

      <FieldTitle>Applicant</FieldTitle>
      <DropDown
        name="Applicant"
        items={issue.requestsData.map(request => request.user.login)}
        onChange={changeRequest}
        selected={index}
        wide
        css={`margin-bottom: ${3 * GU}px`}
      />

      <SubmissionDetails background={`${theme.background}`} border={`${theme.border}`}>
        <UserLink>
          <Avatar user={applicant} />
          {applicantName} applied {applicationDateDistance} ago
        </UserLink>

        <FieldTitle>Work Plan</FieldTitle>
        <DetailHyperText>{application.workplan}</DetailHyperText>

        <Estimations>
          <div>
            <FieldTitle>Estimated Hours</FieldTitle>
            <Text>{application.hours}</Text>
          </div>
          <div>
            <FieldTitle>Estimated Date</FieldTitle>
            <Text>{application.eta}</Text>
          </div>
        </Estimations>
      </SubmissionDetails>

      {('review' in request) && (
        <React.Fragment>
          <FieldTitle>Application Status</FieldTitle>

          <FieldText>
            <Status reviewDate={request.review.reviewDate} approved={request.review.approved} />
          </FieldText>

          <FieldTitle>Feedback</FieldTitle>
          <Text.Block style={{ margin: '10px 0' }}>
            {request.review.feedback.length ? request.review.feedback : 'No feedback was provided'}
          </Text.Block>
        </React.Fragment>
      )}
      {!readOnly && !request.review && (
        <React.Fragment>
          <FormField
            label="Feedback"
            input={
              <TextInput.Multiline
                name='feedback'
                rows="3"
                onChange={updateFeedback}
                placeholder="Do you have any feedback to provide the applicant?"
                value={feedback}
                wide
              />
            }
          />

          <ReviewButtons onAccept={onAccept} onReject={onReject} disabled={false} />

        </React.Fragment>
      )}

    </div>
  )
}
ReviewApplication.propTypes = {
  issue: issueShape,
  requestIndex: PropTypes.number.isRequired,
  readOnly: PropTypes.bool.isRequired,
}

const Estimations = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto;
  grid-gap: 12px;
`

export default ReviewApplication
