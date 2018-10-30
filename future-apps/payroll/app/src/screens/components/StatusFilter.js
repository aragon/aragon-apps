import React from 'react'
import PropTypes from 'prop-types'
import { DropDown } from '@aragon/ui'

import InlineField from '../../components/Field/InlineField'

const options = [
  { label: 'All', filter: null },
  { label: 'Active', filter: employee => !employee.terminated },
  { label: 'Inactive', filter: employee => employee.terminated }
]

const StatusFilter = ({ active, onChange }) => {
  const activeIndex = active &&
    options.indexOf(options.find(f => f.label === active.label))

  return (
    <InlineField label='Status:'>
      <DropDown
        items={options.map(opt => opt.label)}
        active={activeIndex || 0}
        onChange={index => {
          if (typeof onChange === 'function') {
            onChange(options[index])
          }
        }}
      />
    </InlineField>
  )
}

StatusFilter.propTypes = {
  active: PropTypes.shape({
    label: PropTypes.string.isRequired,
    filter: PropTypes.func
  }),
  onChange: PropTypes.func
}

export default StatusFilter
