import React from 'react'
import styled, { css } from 'styled-components'
import { subQuarters, format } from 'date-fns'

import { connect } from '/context/AragonContext'
import { LineChart } from '/components/LineChart'

const QUARTERS_AGO = 4
const MAX_PROPORTION = 4/5

class QuarterlySalariesChart extends React.Component {
  state = {
    settings : [
      {
        optionId: 'monthly',
        color: '#028CD1',
        values: []
      }
    ]
  }

  getHistoryKey = (date) => (format(date, 'YYYYQ', { awareOfUnicodeTokens: true }))

  calculateProportion = (max, value) => {
    return value * MAX_PROPORTION / max
  }

  getInitialHistory = () => {
    const quartes = Array(QUARTERS_AGO + 1)
      .fill()
      .map((_, index) => index)

    const toDay = new Date()
    return quartes.reduce((acc, ago) => {
      const monthAgo = subQuarters(toDay, ago)
      const year = format(monthAgo, 'YY', { awareOfUnicodeTokens: true })
      const quarter = format(monthAgo, 'Q')
      acc[this.getHistoryKey(monthAgo)] = {
        label: `${year} Q${quarter}`,
        amount: 0
      }

      return acc
    }, {});
  }

  groupPayments = () => {
    const { payments } = this.props
    const history = this.getInitialHistory()
    let max = 0

    payments.forEach((payment) => {
      const date = new Date(payment.date)
      const { exchanged } = payment
      const key = this.getHistoryKey(date)
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

      const sortedQuarters = Object.keys(history).sort() // The default sort order is built upon converting the elements into strings, then comparing their sequences of UTF-16 code units values.

      const settings = [
        {
          optionId: 'quarterly',
          color: '#028CD1',
          values: sortedQuarters.map((key) => this.calculateProportion(max, history[key].amount))
        }
      ]

      const labels = [''].concat(sortedQuarters.map((key, i) => history[key].label).slice(1))

      this.setState({ settings, labels })
    }
  }

  render() {
    const { settings, labels } = this.state

    return (
      <ChartWrapper>
        <LineChart settings={settings} durationSlices={6}  labels={labels} captionsHeight={50} />
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

export default connect(mapStateToProps)(QuarterlySalariesChart)
