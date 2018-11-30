import React from 'react'
import styled from 'styled-components'
import { subMonths, format } from 'date-fns'

import { connect } from '../../context/AragonContext'
import { LineChart } from '../../components/LineChart'

const MONTHS_AGO = 12
const MAX_PROPORTION = 4/5

class MonthlySalariesChart extends React.Component {
  state = {
    settings : [
      {
        optionId: 'monthly',
        color: '#028CD1',
        values: []
      }
    ]
  }

  getHistoryKey = (date) => (format(date, 'YYYYMM', { awareOfUnicodeTokens: true }))

  calculateProportion = (max, value) => {
    return value * MAX_PROPORTION / max
  }

  getInitialHistory = () => {
    const months = Array(MONTHS_AGO + 1)
      .fill()
      .map((_, index) => index)

    const toDay = new Date()
    return months.reduce((acc, ago) => {
      const monthAgo = subMonths(toDay, ago)
      acc[this.getHistoryKey(monthAgo)] = {
        label: format(monthAgo, 'MMM').toUpperCase(),
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
      // monthly
      const { max, history } = this.groupPayments()

      const sortedMonths = Object.keys(history).sort() // The default sort order is built upon converting the elements into strings, then comparing their sequences of UTF-16 code units values.

      const settings = [
        {
          optionId: 'monthly',
          color: '#028CD1',
          values: sortedMonths.map((key) => this.calculateProportion(max, history[key].amount))
        }
      ]

      this.setState({ settings })
    }
  }

  render() {
    const { settings } = this.state

    return (
      <Wrapper>
        <LineChart settings={settings} />
      </Wrapper>
    )
  }
}

const Wrapper = styled.div`
  padding: 20px 0;
`

function mapStateToProps ({ payments = [] }) {
  return {
    payments
  }
}

export default connect(mapStateToProps)(MonthlySalariesChart)
