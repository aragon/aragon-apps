import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import {
  Checkbox,
  ContextMenu,
  IconAddUser,
  IconClock,
  IconGraph2,
  IconInfo,
  Tag,
  Text,
  useLayout,
  useTheme,
} from '@aragon/ui'

import { formatDistance } from 'date-fns'
import { BountyContextMenu } from '../Shared'
import { BOUNTY_STATUS, BOUNTY_BADGE_COLOR } from '../../utils/bounty-status'
import { issueShape } from '../../utils/shapes'

const DeadlineDistance = date =>
  formatDistance(new Date(date), new Date(), { addSuffix: true })

const dot = <span css="margin: 0px 10px">&middot;</span>

const labelsTags = (labels, theme) =>
  labels.edges.map(label => (
    <Tag
      key={label.node.id}
      css="margin-right: 10px; width: auto"
      background={'#' + label.node.color + '99'}
      color={`${theme.surfaceContent}`}
      uppercase={false}
    >
      {label.node.name}
    </Tag>
  ))

const FlexibleDiv = ({ compact, children }) => {
  return compact ? (
    <div>
      {children}
    </div>
  ) : (
    <React.Fragment>
      {dot}
      {children}
    </React.Fragment>
  )
}

FlexibleDiv.propTypes = {
  compact: PropTypes.bool,
  children: PropTypes.node.isRequired,
}

const Bounty = ({ issue }) => {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const { workStatus, deadline, expLevel, openSubmission } = issue

  let status = BOUNTY_STATUS[workStatus]
  if (openSubmission && workStatus === 'funded')
    status = BOUNTY_STATUS['open-submission-funded']

  return (
    <React.Fragment>
      <FlexibleDiv compact={layoutName !== 'large'}>
        <span css="white-space: nowrap">
          <IconAddUser
            color={`${theme.surfaceIcon}`}
            css="margin-bottom: -8px; margin-right: 4px"
          />
          {status}
        </span>
        {dot}
        <span css="white-space: nowrap">
          <IconClock color={`${theme.surfaceIcon}`}
            css="margin-bottom: -8px; margin-right: 4px"
          />
          Due {DeadlineDistance(deadline)}
        </span>
      </FlexibleDiv>
      <FlexibleDiv compact={layoutName !== 'large'}>
        <span css="white-space: nowrap">
          <IconGraph2
            css="margin-bottom: -8px; margin-right: 4px"
            color={`${theme.surfaceIcon}`}
          />
          {expLevel}
        </span>
      </FlexibleDiv>
    </React.Fragment>
  )
}

Bounty.propTypes = issueShape

const Issue = ({ isSelected, onClick, onSelect, ...issue }) => {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const {
    workStatus,
    title,
    repo,
    number,
    labels,
    balance,
    symbol,
    createdAt,
  } = issue

  return (
    <StyledIssue theme={theme}>
      <div css="padding: 20px 10px">
        <Checkbox checked={isSelected} onChange={() => onSelect(issue)} />
      </div>

      <IssueData>
        <IssueMain>
          <div>
            <a
              href={`#${issue.id}`}
              css="text-decoration: none"
              onClick={e => {
                e.preventDefault()
                onClick(issue.id)
              }}
            >
              <IssueTitle theme={theme}>{title}</IssueTitle>
            </a>

            {labels.totalCount > 0 && (
              <span>
                {labelsTags(labels, theme)}
              </span>
            )}
          </div>

          <div css="display: flex;">
            <Balance>
              {BOUNTY_STATUS[workStatus] && (
                <Tag
                  css="padding: 10px; margin-right: 10px;"
                  background={BOUNTY_BADGE_COLOR[workStatus].bg}
                  color={BOUNTY_BADGE_COLOR[workStatus].fg}
                >
                  {balance + ' ' + symbol}
                </Tag>
              )}
            </Balance>

            <ContextMenu>
              <BountyContextMenu issue={issue} />
            </ContextMenu>
          </div>
        </IssueMain>

        <IssueDetails>
          <Text.Block color={`${theme.surfaceContentSecondary}`} size="small">
            <span css="font-weight: 600; white-space: nowrap">{repo} #{number}</span>
            <FlexibleDiv compact={layoutName === 'small'}>
              <span css="white-space: nowrap">
                <IconInfo color={`${theme.positiveSurfaceContent}`} css="margin-bottom: -8px; margin-right: 4px" />
                opened {DeadlineDistance(createdAt)}
              </span>
            </FlexibleDiv>
            {issue.hasBounty && (
              <Bounty issue={issue} />
            )}
          </Text.Block>
        </IssueDetails>
      </IssueData>
    </StyledIssue>
  )
}

Issue.propTypes = {
  title: PropTypes.string.isRequired,
  repo: PropTypes.string.isRequired,
  number: PropTypes.number.isRequired,
  isSelected: PropTypes.bool,
  onClick: PropTypes.func.isRequired,
  onSelect: PropTypes.func.isRequired,
  workStatus: PropTypes.oneOf([
    undefined,
    'funded',
    'review-applicants',
    'in-progress',
    'review-work',
    'fulfilled',
  ]),
  work: PropTypes.object,
}

const StyledIssue = styled.div`
  width: 100%;
  background: ${props => props.theme.background};
  background-color: ${props => props.theme.surface};
  display: flex;
  height: auto;
  align-items: flex-start;
  border: 1px solid ${props => props.theme.border};
  margin-bottom: -1px;
  position: relative;
  :first-child {
    border-radius: 3px 3px 0 0;
  }
  :last-child {
    border-radius: 0 0 3px 3px;
  }
`
const IssueData = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  padding: 18px 18px 18px 0;
  position: relative;
  width: calc(100% - 46px);
`
const IssueDetails = styled.div`
  width: 100%;
`
const IssueMain = styled.div`
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`
const Balance = styled.div`
  margin-left: 10px;
  padding-top: 5px;
`
const IssueTitle = styled(Text).attrs({
  size: 'large',
})`
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${props => props.theme.surfaceContent};
  font-size: 1.2em;
  margin-right: 10px;
`

export default Issue
