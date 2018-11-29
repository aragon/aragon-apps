import React from 'react'
import styled from 'styled-components'

import { LineChart } from '../../components/LineChart'

class PaidSalariesChart extends React.Component {
  render() {
    const options = [
      {
        optionId: 1,
        color: '#028CD1',
        values: [
          0, 0.1, 0.3, 0.5, 0.1, 0.7, 1
        ]
      }
    ]

    return (
      <Wrapper>
        <LineChart options={options} />
      </Wrapper>
    )
  }
}

const Wrapper = styled.div`
  padding: 20px 0;
`

export default PaidSalariesChart
