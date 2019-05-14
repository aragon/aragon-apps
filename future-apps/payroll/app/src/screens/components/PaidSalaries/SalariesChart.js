import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { useAppState } from '@aragon/api-react'
import { LineChart } from '../../../components/LineChart'
import { CHART_TYPES, chartSettings, getDurationSlices } from './utils'

const SalariesChart = React.memo(({ type }) => {
  const { totalPaymentsOverTime } = useAppState()

  // TODO: TAKE EVERYTHING HERE WITH A GRAIN OF SALT.
  // IT DOES NOT WORK, BUT IS MEANT TO ILLUSTRATE WHAT THE OLD CODE DID.
  const periodSalaries = totalPaymentsOverTime[type]
  const { settings, labels } = chartSettings(type, periodSalaries)
  const durationSlices = getDurationSlices[type](labels)

  return (
    <ChartWrapper>
      <LineChart
        settings={settings}
        durationSlices={durationSlices}
        labels={labels}
        captionsHeight={50}
        reset
      />
    </ChartWrapper>
  )
})

SalariesChart.propTypes = {
  type: PropTypes.oneOf(CHART_TYPES),
}

const ChartWrapper = styled.div`
  padding: 20px 0;
  dispplay: flex:
`

export default SalariesChart
