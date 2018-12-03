import React from 'react'
import styled, { css } from 'styled-components'
import { subQuarters, format } from 'date-fns'

import { connect } from '../../context/AragonContext'
import { LineChart } from '../../components/LineChart'

const MAX_PROPORTION = 4/5

class YearlySalariesChart extends React.Component {
  state = {
    settings : [
      {
        optionId: 'yearly',
        color: '#028CD1',
        values: []
      }
    ],
    labels: []
  }

  getHistoryKey = (date) => (format(date, 'YYYY', { awareOfUnicodeTokens: true }))

  calculateProportion = (max, value) => {
    return value * MAX_PROPORTION / max
  }

  groupPayments = () => {
    const { payments } = this.props
    let history = {}
    let max = 0

    payments.forEach((payment) => {
      const date = new Date(payment.date)
      const { exchanged } = payment
      const key = this.getHistoryKey(date)

      if (!history[key]) {
        history[key] = {
          label: key,
          amount: 0
        }
      }

      const newAmount = history[key].amount + exchanged
      history[key].amount = newAmount
      max = newAmount > max ? newAmount : max
    })

    return { max, history }
  }

  componentDidUpdate (prevProps) {
    const { payments } = this.props
    const { payments: prevPayments } = prevProps

    if (
      payments &&
      payments.length &&
      (
        !prevPayments ||
        prevPayments.length !== payments.length
      )
    ) {
      const { max, history } = this.groupPayments()

      const sortedYears = Object.keys(history).sort() // The default sort order is built upon converting the elements into strings, then comparing their sequences of UTF-16 code units values.

      const settings = [
        {
          optionId: 'yearly',
          color: '#028CD1',
          values: [0].concat(sortedYears.map((key) => this.calculateProportion(max, history[key].amount)))
        }
      ]

      // const labels = [''].concat(sortedYears.map((key, i) => history[key].label).slice(1))
      const labels = [''].concat(sortedYears.map((key, i) => history[key].label))

      this.setState({ settings, labels })
    }
  }

  render() {
    const { settings, labels } = this.state
    const durationSlices = labels.length ? labels.length + 1 : 2

    return (
      <ChartWrapper>
        <LineChart settings={settings} durationSlices={durationSlices}  labels={labels} captionsHeight={50} />
      </ChartWrapper>
    )
  }
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

export default connect(mapStateToProps)(YearlySalariesChart)
