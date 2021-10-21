import React, { useMemo } from 'react'
import PropTypes from 'prop-types'
import { useAragonApi } from '../../../api-react'
import { useLayout } from '@aragon/ui'
import { useQuery } from '@apollo/react-hooks'
import useShapedIssue from '../../../hooks/useShapedIssue'
import { GET_ISSUE } from '../../../utils/gql-queries.js'
import { initApolloClient } from '../../../utils/apollo-client'
import EventsCard from './EventsCard'
import DetailsCard from './DetailsCard'
import BountyCard from './BountyCard'

const IssueDetail = ({ issueId }) => {
  const { appState: { github } } = useAragonApi()
  const client = useMemo(() => initApolloClient(github.token), [])
  const { layoutName } = useLayout()
  const shapeIssue = useShapedIssue()
  const { loading, error, data } = useQuery(GET_ISSUE, {
    client,
    onError: console.error,
    variables: { id: issueId },
  })

  if (loading) return 'Loading...'
  if (error) return JSON.stringify(error)

  const issue = shapeIssue(data.node)
  const columnView = layoutName === 'small' || layoutName === 'medium'

  return columnView ? (
    <div css="display: flex; flex-direction: column">
      <div css={`
          min-width: 330px;
          width: 100%;
          margin-bottom: ${layoutName === 'small' ? '0.2rem' : '2rem'};
        `}
      >
        <DetailsCard issue={issue} />
      </div>
      <div css="min-width: 330px; width: 100%">
        {issue.hasBounty && <BountyCard issue={issue} />}
        <EventsCard issue={issue} />
      </div>
    </div>
  ) : (
    <div css="display: flex; flex-direction: row">
      <div css={`
          max-width: 705px;
          min-width: 350px;
          width: 70%;
          margin-right: 2rem;
        `}
      >
        <DetailsCard issue={issue} />
      </div>
      <div css="flex-grow: 1">
        {issue.hasBounty && <BountyCard issue={issue} />}
        <EventsCard issue={issue} />
      </div>
    </div>
  )
}

IssueDetail.propTypes = {
  issueId: PropTypes.string.isRequired,
}

export default IssueDetail
