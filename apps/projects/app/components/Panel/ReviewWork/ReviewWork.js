import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { formatDistance } from 'date-fns'
import { BN } from 'web3-utils'

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
import {
  Avatar,
  FieldText,
  IssueTitle,
  ReviewButtons,
  Status,
  SubmissionDetails,
  UserLink,
} from '../PanelComponents'
import workRatings from '../../../utils/work-ratings.js'
import { DetailHyperText } from '../../../../../../shared/ui'

const ReviewWork = ({ issue, submissionIndex, readOnly }) => {
  const githubCurrentUser = useGithubAuth()
  const {
    api: { reviewSubmission },
  } = useAragonApi()
  const { closePanel } = usePanelManagement()
  const theme = useTheme()

  const [ feedback, setFeedback ] = useState('')
  const [ rating, setRating ] = useState(-1)
  const [ index, setIndex ] = useState(submissionIndex)

  const buildReturnData = accepted => {
    const today = new Date()
    return {
      feedback,
      rating,
      accepted,
      user: githubCurrentUser,
      reviewDate: today.toISOString(),
    }
  }

  const onAccept = () => onReviewSubmission(true)
  const onReject = () => onReviewSubmission(false)
  const updateRating = (index) => setRating(index)
  const updateFeedback = e => setFeedback(e.target.value)
  const changeSubmission = (index) => setIndex(index)

  const canSubmit = () => !(rating > 0)

  const onReviewSubmission = async accepted => {
    const data = buildReturnData(accepted)

    // new IPFS data is old data plus state returned from the panel
    const ipfsData = issue.workSubmissions[issue.workSubmissions.length - 1]
    const requestIPFSHash = await ipfsAdd({ ...ipfsData, review: data })

    const total = new BN(issue.data.balance, 10)
    const fulfillers = issue.data.work.fulfillers
    const fulfillmentAmounts = fulfillers.map(() =>
      total.div(new BN(fulfillers.length, 10)).toString()
    )

    closePanel()

    reviewSubmission(
      toHex(issue.repoId),
      issue.number,
      issue.workSubmissions.length - 1,
      accepted,
      requestIPFSHash,
      fulfillmentAmounts
    ).toPromise()
  }

  const work = issue.workSubmissions[index]
  const submitter = issue.work.user
  const submissionDateDistance = formatDistance(new Date(work.submissionDate), new Date())
  const submitterName = submitter.name ? submitter.name : submitter.login

  return(
    <div css={`margin: ${2 * GU}px 0`}>
      <IssueTitle issue={issue} />

      <FieldTitle>Work Submissions</FieldTitle>
      <DropDown
        name="Submission"
        items={issue.workSubmissions.map(submission => submission.user.login)}
        onChange={changeSubmission}
        selected={index}
        wide
        css={`margin-bottom: ${3 * GU}px`}
      />

      <SubmissionDetails background={`${theme.background}`} border={`${theme.border}`}>
        <UserLink>
          <Avatar user={submitter} />
          {submitterName} submitted work {submissionDateDistance} ago
        </UserLink>

        <FieldTitle>Submission</FieldTitle>
        <DetailHyperText>{work.proof}</DetailHyperText>

        {work.comments && (
          <>
            <FieldTitle>Additional Comments</FieldTitle>
            <DetailHyperText>{work.comments}</DetailHyperText>
          </>
        )}

        <FieldTitle>Hours Worked</FieldTitle>
        <Text>{work.hours}</Text>
      </SubmissionDetails>

      {('review' in work) && (
        <React.Fragment>
          <FieldTitle>Submission Status</FieldTitle>
          <FieldText>
            <Status reviewDate={work.review.reviewDate} approved={work.review.accepted} />
          </FieldText>

          <FieldTitle>Feedback</FieldTitle>
          <FieldText>
            <Text.Block>
              {work.review.feedback.length ? work.review.feedback : 'No feedback was provided'}
            </Text.Block>
          </FieldText>

          <FieldTitle>Quality Rating</FieldTitle>
          <FieldText>
            <Text.Block>
              {workRatings[work.review.rating]}
            </Text.Block>
          </FieldText>
        </React.Fragment>
      )}
      {!readOnly && !work.review && (
        <React.Fragment>
          <FormField
            label="Quality Rating"
            required
            input={
              <DropDown
                placeholder="Select rating"
                items={workRatings}
                onChange={updateRating}
                selected={rating}
                wide
              />
            }
          />

          <FormField
            label="Feedback"
            input={
              <TextInput.Multiline
                name="feedback"
                rows="3"
                onChange={updateFeedback}
                value={feedback}
                placeholder="Do you have any feedback to provide the contributor?"
                wide
              />
            }
          />

          <ReviewButtons onAccept={onAccept} onReject={onReject} disabled={canSubmit()} />

        </React.Fragment>
      )}

    </div>
  )
}

ReviewWork.propTypes = {
  issue: issueShape,
  readOnly: PropTypes.bool.isRequired,
  submissionIndex: PropTypes.number.isRequired,
}

export default ReviewWork
