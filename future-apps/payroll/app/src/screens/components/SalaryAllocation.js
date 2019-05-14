import React from 'react'
import PropTypes from 'prop-types'
import { Button } from '@aragon/ui'
import Section from '../../components/Layout/Section'
import { SalaryAllocationType } from '../../types'

const SalaryAllocation = React.memo(({ allocations, onEditAllocation }) => {
  return (
    <section
      css={`
        display: flex;
        flex-direction: column;
      `}
    >
      <Section.Title>Salary allocation</Section.Title>
      {/* TODO: add partition bar */}
      <Button
        mode="secondary"
        onClick={onEditAllocation}
        css="align-self: flex-end"
      >
        Edit salary allocation
      </Button>
    </section>
  )
})

SalaryAllocation.PropTypes = {
  allocations: PropTypes.arrayOf(SalaryAllocationType),
}

export default SalaryAllocation
