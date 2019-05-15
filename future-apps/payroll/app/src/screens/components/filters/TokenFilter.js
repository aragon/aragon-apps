import React from 'react'
import PropTypes from 'prop-types'
import { DropDown } from '@aragon/ui'

import InlineField from '../../../components/Field/InlineField'

class TokenFilter extends React.Component {
  render() {
    const { active, onChange, options } = this.props

    const _options = [{ label: 'All', filter: null }, ...options]

    const activeIndex =
      active && _options.indexOf(_options.find(f => f.label === active.label))

    return (
      <InlineField label="Token:">
        <DropDown
          items={_options.map(opt => opt.label)}
          active={activeIndex || 0}
          onChange={index => {
            if (typeof onChange === 'function') {
              onChange(_options[index])
            }
          }}
        />
      </InlineField>
    )
  }
}

TokenFilter.propTypes = {
  active: PropTypes.shape({
    label: PropTypes.string.isRequired,
    filter: PropTypes.func,
  }),
  onChange: PropTypes.func,
  options: PropTypes.array.isRequired,
}

export default TokenFilter
