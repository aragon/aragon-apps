import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { isDate, format as formatDate } from 'date-fns'

import BaseInput from './BaseInput'
import DatePicker from './DatePicker'

const Container = styled.div`
  position: relative;
`

class DateInput extends React.PureComponent {
  state = {
    showPicker: false,
    value: this.props.value,
  }

  get formattedValue() {
    const { value } = this.state

    return isDate(value) ? formatDate(value, this.props.format) : ''
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside)
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.showPicker !== prevState.showPicker) {
      if (this.state.showPicker) {
        document.addEventListener('mousedown', this.handleClickOutside)
      } else {
        document.removeEventListener('mousedown', this.handleClickOutside)
      }
    }
  }

  handleClick = event => {
    event.stopPropagation()
    this.setState({ showPicker: true })
  }

  handleClickOutside = event => {
    if (this.rootRef && !this.rootRef.contains(event.target)) {
      this.setState({ showPicker: false })
    }
  }

  handleSelect = date => {
    if (typeof this.props.onChange === 'function') {
      this.props.onChange(date)
    }

    this.setState({ showPicker: false })
  }

  render() {
    return (
      <Container
        innerRef={el => (this.rootRef = el)}
        onClick={this.handleClick}
      >
        <BaseInput {...this.props} value={this.formattedValue} readOnly />
        {this.state.showPicker && (
          <DatePicker
            currentDate={this.state.value}
            onSelect={this.handleSelect}
            overlay
          />
        )}
      </Container>
    )
  }
}

DateInput.propTypes = {
  format: PropTypes.string,
  onChange: PropTypes.func,
  value: PropTypes.any,
}

DateInput.defaultProps = {
  format: 'LL/dd/yyyy',
  onChange: () => {},
}

export default DateInput
