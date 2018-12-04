import React from 'react'
import styled from 'styled-components'
import { subYears, isWithinInterval, format } from 'date-fns'
import { zip } from '../../rxjs'

import { theme, Text } from '@aragon/ui'

import { formatCurrency, SECONDS_IN_A_YEAR } from '../../utils/formatting'
import vaultAbi from '../../abi/vault-balance'
import priceFeedAbi from '../../abi/price-feed'
import { toDecimals } from '../../utils/math-utils'
import { connect } from '../../context/AragonContext'

class YearlySalarySummary extends React.Component {
  state = {
    cashReserves: 0
  }

  formatAmount = amount => {
    const { denominationToken } = this.props
    return formatCurrency(
      amount,
      denominationToken.symbol,
      10,
      denominationToken.decimals
    )
  }

  getSymmary = () => {
    const { employees, payments, denominationToken } = this.props

    const totalYearSalaryBill =
      employees.reduce((acc, employee) => acc + employee.salary, 0) *
      SECONDS_IN_A_YEAR
    const today = new Date()
    const yearAgo = subYears(today, 1)
    const thisYearPayments = payments.filter(payment =>
      isWithinInterval(new Date(payment.date), { start: yearAgo, end: today })
    )
    const totalPaidThisYear =
      thisYearPayments.reduce((acc, payment) => acc + payment.exchanged, 0) *
      Math.pow(10, denominationToken.decimals)
    const remainingThisYear = totalYearSalaryBill - totalPaidThisYear

    return {
      totalYearSalaryBill: this.formatAmount(totalYearSalaryBill),
      totalPaidThisYear: this.formatAmount(totalPaidThisYear),
      remainingThisYear: this.formatAmount(remainingThisYear)
    }
  }

  async componentDidUpdate (prevProps) {
    const { vaultAddress: prevVaultAddress } = prevProps
    const {
      app,
      vaultAddress,
      tokens,
      priceFeedAddress,
      denominationToken
    } = this.props

    if (prevVaultAddress !== vaultAddress) {
      const vault = app.external(vaultAddress, vaultAbi)
      const priceFeed = app.external(priceFeedAddress, priceFeedAbi)

      const balances = await Promise.all(
        tokens.map(token => {
          return zip(
            vault.balance(token.address).first(),
            priceFeed.get(denominationToken.address, token.address).first()
          )
          .first()
          .map(([amount, { xrt }]) => {
            const exchangedAmount = amount / xrt
            return {
              ...token,
              exchangedAmount
            }
          })
          .toPromise()
        })
      )

      const cashReserves = balances.reduce((acc, balance) => {
        return acc + balance.exchangedAmount
      }, 0)

      this.setState({
        cashReserves: formatCurrency(cashReserves, denominationToken.symbol, 10, 0, 1, 2, true, true)
      })
    }
  }

  render () {
    const { employees, payments, denominationToken } = this.props
    const { cashReserves } = this.state

    let summary
    if (employees && payments) {
      summary = this.getSymmary()
    }

    return (
      <Container>
        <SummaryTitle>Yearly salary summary</SummaryTitle>
        <SummaryRow>
          <SummaryItem>Salary paid this year</SummaryItem>
          {
            summary
              ? (<SummaryAmount>{summary.totalPaidThisYear}</SummaryAmount>)
              : (<Loading />)
          }
        </SummaryRow>
        <SummaryRow>
          <SummaryItem>Remaining salary this year</SummaryItem>
          {
            summary
              ? (<SummaryAmount>{summary.remainingThisYear}</SummaryAmount>)
              : (<Loading />)
          }
        </SummaryRow>

        <Line />

        <SummaryRow>
          <SummaryItem>Total year salary bill</SummaryItem>
          {
            summary
            ? (<SummaryAmount>{summary.totalYearSalaryBill}</SummaryAmount>)
            : (<Loading />)
          }
        </SummaryRow>
        <SummaryRow>
          <SummaryItem>Cash reserves</SummaryItem>
          {
            cashReserves
              ? (<CashReserves>{cashReserves}</CashReserves>)
              : (<Loading />)
          }
        </SummaryRow>
      </Container>
    )
  }
}

const Container = styled.section`
  display: flex;
  flex-direction: column;
`
const SummaryTitle = styled(Text).attrs({ size: 'large' })`
  font-weight: 600;
  margin-bottom: 10px;
`
const SummaryRow = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
`

const SummaryItem = styled(Text).attrs({
  size: 'large',
  color: theme.textSecondary
})``

const SummaryAmount = styled(Text).attrs({ size: 'normal' })`
  font-weight: 600;
`

const CashReserves = styled(SummaryAmount)`
  color: ${theme.positive};
`

const Line = styled.div`
  padding-top: 20px;
  margin-bottom: 10px;
  border-bottom: 1px solid ${theme.contentBorder};
  width: 100%;
`

const Loading = styled(Text).attrs({ size: 'normal', color: theme.textTertiary })`
  :before {
    content: 'Loading. . .'
  }
`

function mapStateToProps ({
  employees = [],
  payments = [],
  denominationToken = {},
  vaultAddress = '',
  tokens = [],
  priceFeedAddress = ''
}) {
  return {
    employees,
    payments,
    denominationToken,
    vaultAddress,
    tokens,
    priceFeedAddress,
    denominationToken
  }
}

export default connect(mapStateToProps)(YearlySalarySummary)
