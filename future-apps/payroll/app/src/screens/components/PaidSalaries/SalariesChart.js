import React from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'

import { connect } from '/context/AragonContext'
import { LineChart } from '/components/LineChart'

import { CHART_TYPES, chartSettings, getDurationSlices } from './utils'

class SalariesChart extends React.Component {
  state = {
    settings: [],
    labels: []
  }

  componentDidUpdate (prevProps) {
    const { type, payments } = this.props
    const { payments: prevPayments, type: prevType } = prevProps

    if (
      (payments &&
        payments.length &&
        (!prevPayments || prevPayments.length !== payments.length)
      ) ||
      prevType !== type
    ) {
      this.setState(() => chartSettings(type, payments))
    }
  }

  render () {
    const { type } = this.props
    const { settings, labels } = this.state
    const durationSlices = getDurationSlices[type](labels)

    return (
      <ChartWrapper>
        <LineChart
          settings={settings}
          durationSlices={durationSlices}
          labels={labels}
          captionsHeight={50}
          reset={true}
        />
      </ChartWrapper>
    )
  }
}

SalariesChart.propTypes = {
  type: PropTypes.oneOf(CHART_TYPES)
}

const ChartWrapper = styled.div`
  padding: 20px 0;
  dispplay: flex:
`

function mapStateToProps ({ payments = [] }) {
  return {
    payments
  }
}

export default connect(mapStateToProps)(SalariesChart)
