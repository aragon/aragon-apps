import React from 'react'

import TwoColumn from '../components/Layout/TwoColumn'

class MyPayroll extends React.Component {
  render () {
    return (
      <TwoColumn>
        <TwoColumn.Left>
          My Payroll
        </TwoColumn.Left>
        <TwoColumn.Right>
          Side content
        </TwoColumn.Right>
      </TwoColumn>
    )
  }
}

export default MyPayroll
