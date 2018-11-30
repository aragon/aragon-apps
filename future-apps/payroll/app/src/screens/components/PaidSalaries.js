import React from 'react'
import styled from 'styled-components'
import { Text, DropDown } from '@aragon/ui'

import MonthlySalariesChart from './MonthlySalariesChart'

const filterOptions = [
  { label: 'Monthly' },
  { label: 'Quarterly' },
  { label: 'Yearly' }
]

class PaidSalaries extends React.Component {
  render() {
    return (
      <React.Fragment>
        { /* FIXME - Move filter to component*/ }
        <FilteWrapper>
          <FilterLabel>Paid Salaries</FilterLabel>
          <DropDown
            items={filterOptions.map(opt => opt.label)}
          />
        </FilteWrapper>
        <MonthlySalariesChart />
        <ChartLabels>
          <div>SEP</div>
          <div>NOV</div>
          <div>JAN</div>
          <div>MAR</div>
          <div>JUN</div>
          <div>SEP</div>
        </ChartLabels>
      </React.Fragment>
    )
  }
}

export default PaidSalaries

const FilteWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`
const FilterLabel = styled(Text)`
  font-size: 16px;
  font-weight: 600;
`

const ChartLabels = styled.div`
  display: flex;
  flex-direction: row;
  text-align: center;
  justify-content: space-around;
`
