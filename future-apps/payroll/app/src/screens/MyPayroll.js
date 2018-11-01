import React from 'react'

import Section from '../components/Layout/Section'
import SalaryAllocation from './components/SalaryAllocation'

const MyPayroll = () => (
  <Section data-testid='my-payroll-section'>
    <Section.Left>
      My Payroll
    </Section.Left>
    <Section.Right>
      <SalaryAllocation />
    </Section.Right>
  </Section>
)

export default MyPayroll
