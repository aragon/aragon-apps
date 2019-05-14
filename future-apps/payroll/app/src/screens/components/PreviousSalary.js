import React from 'react'
import styled from 'styled-components'
import { useAppState } from '@aragon/api-react'
import Section from '../../components/Layout/Section'
import { employeeType } from '../../types'
import { formatTokenAmount } from '../../utils/formatting'

const PreviousSalary = React.memo(({ currentEmployee }) => {
  const { allowedTokens, denominationToken } = useAppState()
  const { payments } = currentEmployee

  // TODO: add date and token filters
  return (
    <StyledContainer>
      <StyledHeader>
        <Section.Title>Previous Salary</Section.Title>
      </StyledHeader>
      {payments.map(() => {
        // TODO: render table, using the payment details, token details, and `formatTokenAmount()`
        // No need to have a "status" column as it'll always be complete
      })}
    </StyledContainer>
  )
})

PreviousSalary.propTypes = {
  currentEmployee: employeeType,
}

const StyledContainer = styled.section`
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin-bottom: 120px;
`

const StyledHeader = styled.div`
  display: flex;
  justify-content: space-between;
`

export default PreviousSalary
