import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Spring, config } from 'react-spring'
import { useAppState } from '@aragon/api-react'
import { theme, Text } from '@aragon/ui'
import BN from 'bn.js'
import { differenceInSeconds, endOfYear } from 'date-fns'
import { lastItem } from '../../utils'
import { formatTokenAmount } from '../../utils/formatting'

const YearlySalarySummary = React.memo(({ vaultCashReserves }) => {
  const { denominationToken, employees, totalPaymentsOverTime } = useAppState()

  const paidAmountForYear = formatTokenAmount(
    lastItem(totalPaymentsOverTime.yearly),
    denominationToken
  )

  const yearEnd = endOfYear(new Date())
  const rawRemainingSalary = employees
    .map(({ denominationSalary, endDate, lastPayroll }) => {
      const end = endDate && endDate < yearEnd ? endDate : yearEnd
      if (lastPayroll >= end) {
        return new BN(0)
      }

      const remainingSeconds = differenceInSeconds(end, lastPayroll)
      return new BN(remainingSeconds).mul(denominationSalary)
    })
    .reduce((sum, salaryLeft) => sum.add(salaryLeft), new BN(0))
  const remainingSalary = formatTokenAmount(
    rawRemainingSalary,
    denominationToken
  )

  const totalByYearEnd = formatTokenAmount(
    paidAmountForYear.add(remainingSalary),
    denominationToken
  )

  const cashReserves = vaultCashReserves
    ? vaultCashReserves
        .div(new BN(10).pow(denominationToken.decimals))
        .toNumber()
    : null

  return (
    <Container>
      <SummaryTitle>Yearly salary summary</SummaryTitle>
      <SummaryRow>
        <SummaryItem>Salary paid this year</SummaryItem>
        <SummaryAmount>{paidAmountForYear}</SummaryAmount>
      </SummaryRow>
      <SummaryRow>
        <SummaryItem>Remaining salary this year</SummaryItem>
        <SummaryAmount>{remainingSalary}</SummaryAmount>
      </SummaryRow>

      <Line />

      <SummaryRow>
        <SummaryItem>Total year salary bill</SummaryItem>
        <SummaryAmount>{totalByYearEnd}</SummaryAmount>
      </SummaryRow>
      <SummaryRow>
        <SummaryItem>Cash reserves</SummaryItem>
        {cashReserves ? (
          <AnimatedCashReserves
            cashReserves={cashReserves}
            symbol={denominationToken.symbol}
          />
        ) : (
          <Loading />
        )}
      </SummaryRow>
    </Container>
  )
})

YearlySalarySummary.propTypes = {
  vaultCashReserves: PropTypes.instanceOf(BN),
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
  color: theme.textSecondary,
})``

const SummaryAmount = styled(Text).attrs({ size: 'normal' })`
  font-weight: 600;
`

const Line = styled.div`
  padding-top: 20px;
  margin-bottom: 10px;
  border-bottom: 1px solid ${theme.contentBorder};
  width: 100%;
`

const Loading = styled(Text).attrs({
  size: 'normal',
  color: theme.textTertiary,
})`
  &::before {
    content: 'Loading ...';
  }
`

const CashReserves = styled(SummaryAmount)`
  color: ${theme.positive};
`

const AnimatedCashReserves = React.memo(({ cashReserves, symbol }) => (
  <Spring
    from={{ number: 0 }}
    to={{ number: cashReserves }}
    config={config.stiff}
  >
    {({ number }) => <CashReserves>{`+ ${number} ${symbol}`}</CashReserves>}
  </Spring>
))

export default YearlySalarySummary
