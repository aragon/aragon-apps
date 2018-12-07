import React from 'react'

import EmployeeList from './components/EmployeeList'
import KeyStats from './components/KeyStats'
import Section from '../components/Layout/Section'

const TeamPayroll = () => (
  <Section data-testid='team-payroll-section'>
    <Section.Left>
      <EmployeeList />
    </Section.Left>
    <Section.Right>
      <KeyStats />
    </Section.Right>
  </Section>
)

export default TeamPayroll
