import React from 'react'
import styled from 'styled-components'

import Section from '../../components/Layout/Section'
import PaidSalaries from './PaidSalaries'

const KeyStats = () => (
  <Container>
    <Section.SideBarTitle>Key Stats</Section.SideBarTitle>
    <PaidSalaries />
  </Container>
)

const Container = styled.section`
  display: flex;
  flex-direction: column;
`

export default KeyStats

