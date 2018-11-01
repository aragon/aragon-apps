import React from 'react'

import Section from '../components/Layout/Section'

const MyPayroll = () => (
  <Section data-testid='my-payroll-section'>
    <Section.Left>
      My Payroll
    </Section.Left>
    <Section.Right>
      Side content
    </Section.Right>
  </Section>
)

export default MyPayroll
