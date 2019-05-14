import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { useAppState } from '@aragon/api-react'
import BN from 'bn.js'
import Section from '../../components/Layout/Section'
import { employeeType } from '../../types'
import { getYearlySalary } from '../../utils/employee'
import { formatTokenAmount } from '../../utils/formatting'

const AvailableSalary = React.memo(
  ({ currentEmployee, currentEmployeeSalary }) => {
    const { denominationToken } = useAppState()

    const owedSalary = formatTokenAmount(
      currentEmployeeSalary.owedSalary,
      denominationToken
    )
    const totalPayments = formatTokenAmount(
      currentEmployee.payments.reduce(
        (sum, { denominationAmount }) => sum.add(denominationAmount),
        new BN(0)
      ),
      denominationToken
    )
    const formattedYearlySalary = formatTokenAmount(
      getYearlySalary(currentEmployee),
      denominationToken
    )

    return (
      <Container>
        <Header>
          <Section.Title>Available Salary</Section.Title>
          {/* TODO: render table with timer since lastPayroll, available balance, total transferred, yearly salary */}
        </Header>
      </Container>
    )
  }
)

AvailableSalary.propTypes = {
  currentEmployee: employeeType,
  currentEmployeeSalary: PropTypes.object,
}

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

export default AvailableSalary
