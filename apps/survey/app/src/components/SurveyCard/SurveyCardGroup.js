import React from 'react'
import styled from 'styled-components'
import { Badge, Text } from '@aragon/ui'

const SurveyCardGroup = ({ title, count, children }) => (
  <Main>
    <Title>
      <Text size="large" weight="bold">
        {title}
      </Text>
      <TitleBadge>
        <Badge.Info>{count}</Badge.Info>
      </TitleBadge>
    </Title>
    <Grid>{children}</Grid>
  </Main>
)

const Main = styled.section`
  & + & {
    padding-top: 35px;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  grid-auto-rows: 320px;
  grid-gap: 30px;
`

const Title = styled.h1`
  display: flex;
  align-items: center;
  margin-bottom: 25px;
`

const TitleBadge = styled.span`
  margin-left: 10px;
  display: flex;
  align-items: center;
`

export default SurveyCardGroup
