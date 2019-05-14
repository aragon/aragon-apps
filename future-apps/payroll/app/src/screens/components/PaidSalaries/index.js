import React from 'react'
import styled from 'styled-components'
import { Text, DropDown } from '@aragon/ui'
import SalariesChart from './SalariesChart'
import { CHART_TYPES } from './utils'

class PaidSalaries extends React.Component {
  state = {
    activeFilter: 0,
  }

  render() {
    const { activeFilter } = this.state

    return (
      <React.Fragment>
        <FilterWrapper>
          <FilterLabel>Paid Salaries</FilterLabel>
          <DropDown
            items={CHART_TYPES}
            active={activeFilter}
            onChange={activeFilter => {
              this.setState({ activeFilter })
            }}
          />
        </FilterWrapper>
        <SalariesChart type={CHART_TYPES[activeFilter]} />
      </React.Fragment>
    )
  }
}

export default PaidSalaries

const FilterWrapper = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
`
const FilterLabel = styled(Text)`
  font-size: 16px;
  font-weight: 600;
`
