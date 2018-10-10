import React from 'react'

import TwoColumn from '../components/Layout/TwoColumn'

class TeamPayroll extends React.Component {
  render () {
    return (
      <TwoColumn>
        <TwoColumn.Left>
          Team Payroll
        </TwoColumn.Left>
        <TwoColumn.Right>
          Side content
        </TwoColumn.Right>
      </TwoColumn>
    )
  }
}

export default TeamPayroll
