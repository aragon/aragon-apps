import React from 'react'
import styled from 'styled-components'
import { useAppState } from '@aragon/api-react'
import BN from 'bn.js'
import Section from '../../components/Layout/Section'
import { lastItem } from '../../utils'
import { getYearlySalary } from '../../utils/employee'
import { formatTokenAmount } from '../../utils/formatting'

const TotalPayroll = React.memo(() => {
  const { denominationToken, employees, totalPaymentsOverTime } = useAppState()

  const rawAverageYearlySalary = employees
    .reduce((sum, employee) => sum.add(getYearlySalary(employee)), new BN(0))
    .div(new BN(employees.length))

  const averageYearlySalary = formatTokenAmount(
    rawAverageYearlySalary,
    denominationToken
  )
  const monthlyBurnRate = formatTokenAmount(
    rawAverageYearlySalary.div(12),
    denominationToken
  )
  const paidAmountForYear = formatTokenAmount(
    lastItem(totalPaymentsOverTime.yearly),
    denominationToken
  )

  // TODO: use formatTokenAmount() on each token value above (averageYearlySalary, monthlyBurnRate,
  // paidAmountForYear before rendering
  return (
    <Container>
      <Header>
        <Section.Title>Total Payroll</Section.Title>
      </Header>
      {/* TODO: render table with number of employees, average salary, monthly burn, total paid */}
    </Container>
  )
})

const Container = styled.section`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 2em;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
`

export default TotalPayroll
