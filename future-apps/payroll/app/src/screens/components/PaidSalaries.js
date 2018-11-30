import React from 'react'
import styled from 'styled-components'
import { Text, DropDown } from '@aragon/ui'

import MonthlySalariesChart from './MonthlySalariesChart'

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
          <div>QUARTERLY CHART</div>
        )

      case YEARLY:
        return (
          <div>YEARLY CHART</div>
        )

      default:
        return null
    }
  }

  render() {
    const { activeFilter } = this.state

    return (
      <React.Fragment>
        { /* FIXME - Move filter to component*/ }
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
