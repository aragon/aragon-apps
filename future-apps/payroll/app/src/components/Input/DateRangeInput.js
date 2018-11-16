import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { isAfter, isBefore, isEqual, isDate, format as formatDate } from 'date-fns'

import BaseInput from './BaseInput'
import DatePicker from './DatePicker'

const Container = styled.div`
  position: relative;
`

class DateRangeInput extends React.PureComponent {
  state = {
    showPicker: false,
    startDate: this.props.startDate,
    endDate: this.props.endDate,
    startPicker: null,
    endPicker: null,
    startDateSelected: false,
    endDateSelected: false
  }

  get formattedStartDate () {
    const { startDate } = this.state

    return isDate(startDate) ? formatDate(startDate, this.props.format) : ''
  }

  get formattedEndDate () {
    const { endDate } = this.state

    return isDate(endDate) ? formatDate(endDate, this.props.format) : ''
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.handleClickOutside)
  }

  componentDidUpdate (prevProps, prevState) {
    if (this.state.showPicker !== prevState.showPicker) {
      if (this.state.showPicker) {
        document.addEventListener('mousedown', this.handleClickOutside)
      } else {
        document.removeEventListener('mousedown', this.handleClickOutside)
      }
    }
  }

  handleClick = (event) => {
    event.stopPropagation()
    this.setState({ showPicker: true })
  }

  handleClickOutside = (event) => {
    if (this.rootRef && !this.rootRef.contains(event.target)) {
      this.setState({ showPicker: false })
    }
  }

  handleSelectStartDate = (date) => {
    const { endDate } = this.state
    const isValidDate = isBefore(date, endDate) || isEqual(date, endDate)
    if (typeof this.props.onStartDateChange === 'function' && isValidDate) {
      this.props.onStartDateChange(date)
      this.setState({ startDateSelected: true, startDate: date })
    }
  }

  handleSelectEndDate = (date) => {
    const { startDate } = this.state
    const isValidDate = isAfter(date, startDate) || isEqual(date, startDate)
    if (typeof this.props.onEndDateChange === 'function' && isValidDate) {
      this.props.onEndDateChange(date)
      this.setState({ endDateSelected: true, endDate: date })
    }
  }

  render () {
    const { startDate, endDate } = this.state
    return (
      <Container
        innerRef={el => this.rootRef = el}
        onClick={this.handleClick}
      >
        <BaseInput
          style={{ fontWeight: 'bold', color: '#000000' }}
          value={`${this.formattedStartDate} - ${this.formattedEndDate}`}
          readOnly={true}
        />
        {this.state.showPicker && (
          <React.Fragment>
            <div
              style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'baseline',
                left: '-250px',
                zIndex: 1
              }}
            >
              <DatePicker
                key={`start-picker-${startDate}`}
                name="start-date-picker"
                style={{ display: 'inline' }}
                currentDate={startDate}
                onSelect={this.handleSelectStartDate}
                overlay={false}
              />
              <DatePicker
                key={`end-picker-${endDate}`}
                name="end-date-picker"
                style={{ display: 'inline' }}
                currentDate={endDate}
                onSelect={this.handleSelectEndDate}
                overlay={false}
              />
            </div>
          </React.Fragment>
        )}
      </Container>
    )
  }
}

DateRangeInput.propTypes = {
  endDate: PropTypes.instanceOf(Date),
  format: PropTypes.string,
  onChange: PropTypes.func,
  startDate: PropTypes.instanceOf(Date)
}

DateRangeInput.defaultProps = {
  format: 'LL/dd/yyyy',
  onChange: () => {}
}

export default DateRangeInput
