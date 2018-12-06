import React from 'react'
import styled from 'styled-components'
import { Text, DropDown } from '@aragon/ui'

import SalariesChart from './SalariesChart'

import { CHART_TYPES } from './utils'

const [MONTHLY, QUARTERLY, YEARLY] = CHART_TYPES

class PaidSalaries extends React.Component {
  state = {
    activeFilter: 0
  }

  render() {
    const { activeFilter } = this.state

    return (
      <React.Fragment>
        <FilteWrapper>
          <FilterLabel>Paid Salaries</FilterLabel>
          <DropDown
            items={CHART_TYPES}
            active={activeFilter}
            onChange={activeFilter => {
              this.setState({ activeFilter })
            }}
          />
        </FilteWrapper>
        <SalariesChart type={CHART_TYPES[activeFilter]} />
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
