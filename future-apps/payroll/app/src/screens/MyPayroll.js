import React from 'react'

import Section from '../components/Layout/Section'
import SalaryAllocation from './components/SalaryAllocation'
import PreviousSalary from './components/PreviousSalary'
import AvailableSalary from './components/AvailableSalary'

// TODO: display empty state if current account is not employee
const MyPayroll = React.memo(
  ({
    currentEmployee,
    currentEmployeeSalary,
    currentEmployeeSalaryAllocations,
    onEditAllocation,
  }) => (
    <Section data-testid="my-payroll-section">
      <Section.Left>
        <AvailableSalary
          currentEmployee={currentEmployee}
          currentEmployeeSalary={currentEmployeeSalary}
        />
        <PreviousSalary currentEmployee={currentEmployee} />
      </Section.Left>
      <Section.Right>
        <SalaryAllocation
          allocations={currentEmployeeSalaryAllocations}
          onEditAllocation={onEditAllocation}
        />
      </Section.Right>
    </Section>
  )
)

export default MyPayroll
