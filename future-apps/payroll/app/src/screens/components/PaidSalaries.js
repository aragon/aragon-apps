import React from 'react'
import styled from 'styled-components'
import { Text, DropDown } from '@aragon/ui'

import MonthlySalariesChart from './MonthlySalariesChart'
import QuarterlySalariesChart from './QuarterlySalariesChart'
import YearlySalariesChart from './YearlySalariesChart'

const FILTER_OPTIONS = ['Monthly', 'Quarterly', 'Yearly']
const [MONTHLY, QUARTERLY, YEARLY] = FILTER_OPTIONS

class PaidSalaries extends React.Component {
  state = {
    activeFilter: 0
  }

  renderChart = (chartType) => {
    switch (chartType) {
      case MONTHLY:
        return (
           <MonthlySalariesChart />
        )

      case QUARTERLY:
        return (
          <QuarterlySalariesChart />
        )

      case YEARLY:
        return (
          <YearlySalariesChart />
        )

      default:
        return null
    }
  }

  render() {
    const { activeFilter } = this.state

    return (
      <React.Fragment>
        <FilteWrapper>
          <FilterLabel>Paid Salaries</FilterLabel>
          <DropDown
            items={FILTER_OPTIONS}
            active={activeFilter}
            onChange={activeFilter => {
              this.setState({ activeFilter })
            }}
          />
        </FilteWrapper>
        {this.renderChart(FILTER_OPTIONS[activeFilter])}
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
