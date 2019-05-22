import React from 'react'

import Section from '../components/Layout/Section'
import EmployeeList from './components/EmployeeList'
import KeyStats from './components/KeyStats'
import TotalPayroll from './components/TotalPayroll'

const TeamPayroll = () => (
  <Section>
    <Section.Left>
      <TotalPayroll />
      <EmployeeList />
    </Section.Left>
    <Section.Right>
      <KeyStats />
    </Section.Right>
  </Section>
)

export default TeamPayroll
