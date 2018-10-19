import React from 'react'

import Section from '../components/Layout/Section'

class MyPayroll extends React.Component {
  render () {
    return (
      <Section {...this.props}>
        <Section.Left>
          My Payroll
        </Section.Left>
        <Section.Right>
          Side content
        </Section.Right>
      </Section>
    )
  }
}

export default MyPayroll
