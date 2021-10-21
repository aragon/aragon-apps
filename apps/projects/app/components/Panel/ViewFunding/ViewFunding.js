import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'

import { useAragonApi } from '../../../api-react'
import { IdentityBadge, Text, theme } from '@aragon/ui'
import BigNumber from 'bignumber.js'

import Issue, { Dot } from './Issue'

const calcTotalFunding = issues => {
  const totalsByToken = issues.reduce((group, issue) => {
    group[issue.tokenSymbol] = group[issue.tokenSymbol] || {
      total: 0,
      symbol: issue.tokenSymbol,
    }
    group[issue.tokenSymbol].total = issue.balance.plus(
      group[issue.tokenSymbol].total
    )
    return group
  }, {})

  return Object.values(totalsByToken).map(
    ({ total, symbol }) => `${total.dp(3).toString()} ${symbol}`
  )
}

const ViewFunding = ({ createdBy, fundingEventId }) => {
  const { appState } = useAragonApi()
  const tokens = appState.tokens.reduce((tokenObj, token) => {
    tokenObj[token.addr] = {
      symbol: token.symbol,
      decimals: token.decimals,
    }
    return tokenObj
  }, {})

  const description = 'Funding Request cannot be retrieved at this time; this feature will be completed soon.' // FIXME: how to retrieve this?
  const issues = appState.issues
    .filter(i => i.data.key === fundingEventId)
    .map(i => ({
      balance: BigNumber(i.data.balance).div(
        BigNumber(10 ** tokens[i.data.token].decimals)
      ),
      expLevel: appState.bountySettings.expLvls[i.data.exp].name,
      deadline: i.data.deadline,
      hours: i.data.hours,
      number: i.data.number,
      repo: i.data.repo,
      title:
        i.data.title ||
        'Issue list cannot be retrieved at this time; this feature will be completed soon.', // FIXME: this attr is in `issue` returned from Issues.js, but not in appState.issues
      tokenSymbol: tokens[i.data.token].symbol,
      url: i.data.url || 'https://github.com/404', // FIXME: this attr is in `issue` returned from Issues.js, but not in appState.issues
      workStatus: i.data.workStatus,
    }))

  return (
    <Grid>
      <Half>
        <Label>Created By</Label>
        <IdentityBadge entity={createdBy.login} />
      </Half>
      <Half>
        <Label>Status</Label>
        {issues[0].workStatus}
      </Half>
      <Full>
        <Label>Description</Label>
        {description}
      </Full>
      <Half>
        <Label>Total Funding</Label>
        {calcTotalFunding(issues).join(<Dot />)}
      </Half>
      <Half>
        <Label>Total Issues</Label>
        {issues.length}
      </Half>
      {issues.map(issue => (
        <Full key={issue.number}>
          <Issue key={issue.number} {...issue} />
        </Full>
      ))}
    </Grid>
  )
}

ViewFunding.propTypes = {
  createdBy: PropTypes.shape({
    avatarUrl: PropTypes.string.isRequired,
    login: PropTypes.string.isRequired,
    url: PropTypes.string.isRequired,
  }).isRequired,
  fundingEventId: PropTypes.string.isRequired,
}

const Grid = styled.div`
  background: ${theme.contentBorder};
  display: grid;
  grid-gap: 1px;
  grid-template-columns: 50% 50%;
  margin: 0 -30px;
  padding-top: 1px;
  > * {
    background: white;
    padding: 30px;
  }
`
const Half = styled.div`
  grid-column: span 1;
`
const Full = styled.div`
  grid-column: span 2;
`
const Label = styled(Text.Block).attrs({
  size: 'small',
  color: theme.textTertiary,
})`
  margin-bottom: 15px;
  text-transform: uppercase;
  white-space: nowrap;
`

export default ViewFunding
