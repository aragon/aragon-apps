import React from 'react'
import styled from 'styled-components'
import { useAppState } from '@aragon/api-react'
import Section from '../../components/Layout/Section'
import { getYearlySalary } from '../../utils/employee'
import { formatTokenAmount } from '../../utils/formatting'

const EmployeeList = React.memo(() => {
  const { denominationToken, employees } = useAppState()

  // TODO: add date and token filters
  return (
    <Container>
      <Header>
        <Section.Title>Employees</Section.Title>
      </Header>
      {employees.map(employee => {
        const {
          accountAddress,
          endDate,
          isActive,
          lastPayroll,
          role,
        } = employee.data
        const yearlySalary = formatTokenAmount(
          getYearlySalary(employee),
          denominationToken
        )
        const paidAmountForYear = formatTokenAmount(
          employee.paidAmountForYear,
          denominationToken
        )

        // TODO: render table with account address, start date, end date (if not active), role,
        // yearly salary, total paid this year
        return null
      })}
    </Container>
  )
})

const Container = styled.article`
  display: flex;
  flex-direction: column;
  align-items: stretch;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
`

const Filters = styled.div`
  display: flex;
  justify-content: space-between;

  > * {
    margin-left: 1rem;
  }
`

export default EmployeeList
