import React from 'react'
import styled from 'styled-components'
import { AppBar, Badge, Button } from '@aragon/ui'

const AppBarWrapper = ({ token, onOpenNewSurveyPanel }) => (
  <AppBar
    title={
      <Title>
        <span>Survey</span>
        <Badge>{token}</Badge>
      </Title>
    }
    endContent={
      <Button mode="strong" onClick={onOpenNewSurveyPanel}>
        New Survey
      </Button>
    }
  />
)

const Title = styled.span`
  display: flex;
  align-items: center;
  > :first-child {
    margin-right: 10px;
  }
`

export default AppBarWrapper
