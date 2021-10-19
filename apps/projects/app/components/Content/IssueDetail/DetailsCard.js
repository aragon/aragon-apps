import React from 'react'
import {
  Box,
  ContextMenu,
  GU,
  IconInfo,
  Tag,
  Text,
  useTheme,
} from '@aragon/ui'
import { BountyContextMenu } from '../../Shared'
import { BOUNTY_BADGE_COLOR } from '../../../utils/bounty-status'
import { Markdown } from '../../../../../../shared/ui'
import Label from './Label'
import { issueShape } from '../../../utils/shapes.js'
import { IssueTitleLink } from '../../Panel/PanelComponents'
import { formatDistance } from 'date-fns'

const OpenedAgo = ({ date }) =>
  formatDistance(new Date(date), new Date(), { addSuffix: true })

const Dot = () => <span css="margin: 0px 10px">&middot;</span>

const Title = ({ issue }) => {
  const theme = useTheme()

  return (
    <div css={`
      display: flex;
      flex-direction: column;
      flex-basis: 100%;
      flex: 2;
      margin-right: 20px;
    `}>
      <Text.Block size="xxlarge" style={{ marginBottom: 1.5 * GU + 'px' }}>
        {issue.title}
      </Text.Block>
      <div css="display: flex">
        <IssueTitleLink issue={issue} />
        <div css={`display: flex; align-items: center; margin-bottom: ${1.5 * GU}px`}>
          <Dot />
          <IconInfo
            color={`${theme.positiveSurfaceContent}`}
            css={`margin-top: -${.5 * GU}px; margin-right: ${.6 * GU}px`}
          />
          Opened <OpenedAgo date={issue.createdAt} />
        </div>
      </div>
    </div>
  )
}

Title.propTypes = issueShape

const Bounty = ({ issue }) => (
  <div css={`
    display: flex;
    flex-direction: column;
    flex-basis: 100%;
    flex: 0;
    align-items: flex-end;
  `}>
    <ContextMenu>
      <BountyContextMenu issue={issue} />
    </ContextMenu>
    {issue.balance > 0 && (
      <Tag
        css="padding: 10px; text-size: large; margin-top: 15px"
        background={BOUNTY_BADGE_COLOR[issue.workStatus].bg}
        color={BOUNTY_BADGE_COLOR[issue.workStatus].fg}
      >
        {issue.balance + ' ' + issue.symbol}
      </Tag>
    )}
  </div>
)
Bounty.propTypes = issueShape

const DetailsCard = ({ issue }) => {
  const theme = useTheme()

  return (
    <Box css={`padding-top: ${GU}px`}>
      <div css={`
        display: flex;
        justify-content: space-between;
      `}>
        <Title issue={issue} />
        <Bounty issue={issue} />
      </div>

      {issue.labels.totalCount > 0 && (
        <div css={`margin-bottom: ${2 * GU}px`}>
          {issue.labels.edges.map(label => (
            <Tag
              key={label.node.id}
              css={`margin-right: ${.6 * GU}px`}
              background={'#' + label.node.color + '99'}
              color={`${theme.content}`}
              uppercase={false}
            >
              {label.node.name}
            </Tag>
          ))}
        </div>
      )}

      <Label text="Description" />
      <div css={`
        height: 100%;
        display: flex;
        align-items: center;
        margin-top: ${GU}px;
      `}>
        <Markdown
          content={issue.body || 'No description available'}
          style={{ marginBottom: 2 * GU + 'px' }}
        />
      </div>

    </Box>
  )
}

DetailsCard.propTypes = issueShape

export default DetailsCard
