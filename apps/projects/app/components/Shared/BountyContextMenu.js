import React from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { ContextMenuItem, GU, theme } from '@aragon/ui'
import { usePanelManagement } from '../Panel'
import { issueShape } from '../../utils/shapes.js'
import { IconCoin, IconFile, IconView, useTheme } from '@aragon/ui'
import { useAragonApi } from '../../api-react'


const MenuItem = ({ panel, panelParams, caption, Icon }) => {
  const theme = useTheme()

  return (
    <Item onClick={() => panel(panelParams)}>
      <Icon color={`${theme.surfaceContent}`} />
      <ActionLabel>
        {caption}
      </ActionLabel>
    </Item>
  )
}
MenuItem.propTypes = {
  panel: PropTypes.func.isRequired,
  caption: PropTypes.string.isRequired,
  panelParams: PropTypes.oneOfType([
    PropTypes.object,
    PropTypes.arrayOf(PropTypes.object)
  ]).isRequired,
  Icon: PropTypes.func.isRequired,
}

const pluralize = (word, number) => `${word}${number > 1 ? 's (' + number + ')' : ''}`

const BountyContextMenu = ({ issue }) => {
  const pastDeadline = (new Date()) > (new Date(issue.deadline))
  const { openSubmission, workStatus, assignee } = issue
  const { connectedAccount } = useAragonApi()
  const {
    allocateBounty,
    requestAssignment,
    reviewApplication,
    reviewWork,
    submitWork,
  } = usePanelManagement()

  switch(workStatus) {
  case undefined: return (
    <MenuItem panel={allocateBounty} panelParams={[issue]} caption="Fund issue" Icon={IconCoin} />
  )
  case 'funded': return openSubmission ? (
    <MenuItem panel={submitWork} panelParams={issue} caption="Submit work" Icon={IconFile} />
  ) : (
    <MenuItem panel={requestAssignment} panelParams={issue} caption="Submit application" Icon={IconFile} />
  )
  case 'review-applicants': return (
    <>
      {!pastDeadline && (
        <MenuItem panel={requestAssignment} panelParams={issue} caption="Submit application" Icon={IconFile} />
      )}
      <MenuItem
        panel={reviewApplication}
        panelParams={{ issue }}
        caption={pluralize('View application', issue.requestsData.length)}
        Icon={IconView}
      />
    </>
  )
  case 'in-progress': return (
    <>
      {(connectedAccount === assignee) && (
        <MenuItem panel={submitWork} panelParams={issue} caption="Submit work" Icon={IconFile} />
      )}
      <MenuItem
        panel={reviewApplication}
        panelParams={{ issue }}
        caption={pluralize('View application', issue.requestsData.length)}
        Icon={IconView}
      />
    </>
  )
  case 'review-work': return (
    <>
      {openSubmission && (
        <MenuItem panel={submitWork} panelParams={issue} caption="Submit work" Icon={IconFile} />
      )}
      <MenuItem
        panel={reviewWork}
        panelParams={{ issue }}
        caption={pluralize('View work submission', issue.workSubmissions.length)}
        Icon={IconView}
      />
      {!openSubmission && (
        <MenuItem
          panel={reviewApplication}
          panelParams={{ issue }}
          caption={pluralize('View application', issue.requestsData.length)}
          Icon={IconView}
        />
      )}
    </>
  )
  case 'fulfilled': return (
    <>
      <MenuItem
        panel={reviewWork}
        panelParams={{ issue }}
        caption={pluralize('View work submission', issue.workSubmissions.length)}
        Icon={IconView}
      />
      {!openSubmission && (
        <MenuItem
          panel={reviewApplication}
          panelParams={{ issue }}
          caption={pluralize('View application', issue.requestsData.length)}
          Icon={IconView}
        />
      )}
    </>
  )
  }
}

const Item = styled(ContextMenuItem)`
  display: flex;
  align-items: center;
  padding: ${1 * GU}px ${2 * GU}px;
  ${props =>
    props.bordered &&
    css`
      border-top: 1px solid ${theme.shadow};
    `};
`
const ActionLabel = styled.span`
  margin-left: 8px;
`

BountyContextMenu.propTypes = issueShape

export default BountyContextMenu
