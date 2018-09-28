import React from 'react'
import styled from 'styled-components'
import { theme, IconCross, IconCheck } from '@aragon/ui'

const VoteSuccess = ({ success = true, vote }) => {
  const Icon = success ? IconCheck : IconCross
  return (
    <Main>
      <IconWrapper>
        <Icon />
      </IconWrapper>
      <StatusLabel>
        {success ? 'Vote will pass' : 'Vote won’t pass'}
      </StatusLabel>
    </Main>
  )
}

const Main = styled.div`
  display: flex;
  align-items: center;
  white-space: nowrap;
  color: ${theme.textSecondary};
  font-size: 13px;
`

const IconWrapper = styled.span`
  margin-top: 1px;
`

const StatusLabel = styled.span`
  margin-left: 15px;
`

export default VoteSuccess
