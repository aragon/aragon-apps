import React from 'react'
import styled from 'styled-components'

import PaidSalaries from './PaidSalaries'
import YearlySalarySummary from './YearlySalarySummary'
import Section from '../../components/Layout/Section'

const KeyStats = () => (
  <Container>
    <Section.SideBarTitle>Key Stats</Section.SideBarTitle>
    <PaidSalaries />
    <YearlySalarySummary />
  </Container>
)

const Container = styled.section`
  display: flex;
  flex-direction: column;
`

export default KeyStats
