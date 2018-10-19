import React from 'react'

import Section from '../components/Layout/Section'

class TeamPayroll extends React.Component {
  render () {
    return (
      <Section {...this.props}>
        <Section.Left>
          Team Payroll
        </Section.Left>
        <Section.Right>
          Side content
        </Section.Right>
      </Section>
    )
  }
}

export default TeamPayroll
