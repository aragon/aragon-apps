import React from 'react'
import styled from 'styled-components'

import { Badge, Text, theme } from '@aragon/ui'
import { formatDistance } from 'date-fns'
import { issueShape } from '../../../utils/shapes.js'

import { BOUNTY_STATUS, BOUNTY_BADGE_COLOR } from '../../../utils/bounty-status'

const Issue = ({
  balance,
  expLevel,
  deadline,
  hours,
  number,
  repo,
  tokenSymbol,
  title,
  workStatus,
}) => (
  <Wrap>
    <Left>
      <Text.Block color={theme.textSecondary} size="small">
        {repo} #{number}
      </Text.Block>
      <Title>{title}</Title>
      <Details>
        <span>{hours} hours</span>
        <Dot />
        <span>{expLevel}</span>
        <Dot />
        <span>
          Due{' '}
          {formatDistance(new Date(deadline), new Date(), { addSuffix: true })}
        </span>
      </Details>
    </Left>
    <Right>
      {BOUNTY_STATUS[workStatus] && (
        <Badge
          style={{ padding: '10px' }}
          background={BOUNTY_BADGE_COLOR[workStatus].bg}
          foreground={BOUNTY_BADGE_COLOR[workStatus].fg}
        >
          {balance.dp(3).toString() + ' ' + tokenSymbol}
        </Badge>
      )}
    </Right>
  </Wrap>
)

Issue.propTypes = issueShape.isRequired

const Wrap = styled.div`
  display: flex;
  flex-flow: row wrap;
  align-items: center;
  margin-left: -1em;
  margin-top: -7px;
  > * {
    margin-left: 1em;
    margin-top: 7px;
  }
`
const Left = styled.div`
  flex: 1;
`
const Right = styled.div`
  flex: 0 0 1px;
`
const Title = styled(Text.Block)`
  margin: 5px 0 7px;
`
const Details = styled(Text.Block).attrs({
  color: theme.textTertiary,
  size: 'xsmall',
})`
  white-space: nowrap;
`

// Ensures screen readers don't smash adjacent items together
const Spacer = props => <span {...props}> </span>

// Adds extra visual distinction to Spacer with a glyph that is:
//   * ignored by screen readers
//   * not selected when selecting surrounding text for copy/paste
export const Dot = styled(Spacer).attrs({
  'aria-hidden': true,
})`
  :before {
    content: '·';
    margin-left: 6px;
    margin-right: 6px;
  }
`

export default Issue
