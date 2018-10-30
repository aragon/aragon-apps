import React from 'react'
import PropTypes from 'prop-types'
import { DropDown } from '@aragon/ui'

import InlineField from '../../components/Field/InlineField'

const RoleFilter = ({ active, onChange, roles }) => {
  const options = [
    { label: 'All', filter: null },
    ...Array.from(roles).sort().map(role => (
      { label: role, filter: employee => employee.role === role })
    )
  ]

  const activeIndex = active &&
    options.indexOf(options.find(f => f.label === active.label))

  return (
    <InlineField label='Role Type:'>
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

RoleFilter.propTypes = {
  active: PropTypes.shape({
    label: PropTypes.string.isRequired,
    filter: PropTypes.func
  }),
  onChange: PropTypes.func,
  roles: PropTypes.instanceOf(Set).isRequired
}

export default RoleFilter
