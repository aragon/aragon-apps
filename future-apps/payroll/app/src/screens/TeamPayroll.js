import React from 'react'

import EmployeeList from './components/EmployeeList'
import KeyStats from './components/KeyStats'
import Section from '../components/Layout/Section'
import TotalPayroll from './components/TotalPayroll'

const TeamPayroll = () => (
  <Section data-testid='team-payroll-section'>
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
