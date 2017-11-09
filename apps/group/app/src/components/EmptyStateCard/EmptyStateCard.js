import React from 'react'
import styled from 'styled-components'
import { Text, Button, Card, theme } from '@aragon/ui'

import icon from './assets/icon.svg'

const StyledCard = styled(Card)`
  display: flex;
  padding: 40px 60px;
  align-items: center;
  text-align: center;
  section {
    padding-top: 20px;
  }
  h1 {
    margin: 20px 0 5px;
  }
  button {
    width: 150px;
    margin-top: 20px;
  }
`

const EmptyStateCard = ({ groupName, onActivate }) => (
  <StyledCard>
    <section>
      <img src={icon} alt="" />
      <Text heading="1" color={theme.accent} weight="bold" size="large">
        Nothing here.
      </Text>
      <Text>Add Entity to the Group {groupName}.</Text>
      <Button mode="strong" onClick={onActivate}>
        Add
      </Button>
    </section>
  </StyledCard>
)

export default EmptyStateCard
