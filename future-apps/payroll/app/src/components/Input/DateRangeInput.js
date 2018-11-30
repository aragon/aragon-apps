import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  isAfter, isBefore, isEqual, isDate,
  format as formatDate,
  startOfDay, endOfDay
} from 'date-fns'

import BaseInput from './BaseInput'
import DatePicker from './DatePicker'


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
      this.props.onStartDateChange(startOfDay(date))
      this.setState({ startDateSelected: true, startDate: startOfDay(date) })
    }
  }

  handleSelectEndDate = (date) => {
    const { startDate } = this.state
    const isValidDate = isAfter(date, startDate) || isEqual(date, startDate)
    if (typeof this.props.onEndDateChange === 'function' && isValidDate) {
      this.props.onEndDateChange(endOfDay(date))
      this.setState({ endDateSelected: true, endDate: endOfDay(date) })
    }
  }

  render () {
    const { startDate, endDate } = this.state
    const { icon, iconposition } = this.props
    return (
      <StyledContainer
        innerRef={el => this.rootRef = el}
        onClick={this.handleClick}
      >
        <StyledBaseInput
          value={`${this.formattedStartDate} - ${this.formattedEndDate}`}
          readOnly={true}
          icon={icon}
          iconposition={iconposition}
          height={39}
        />
        {this.state.showPicker && (
          <React.Fragment>
            <StyledDatePickersContainer>
              <DatePicker
                key={`start-picker-${startDate}`}
                name="start-date-picker"
                currentDate={startDate}
                onSelect={this.handleSelectStartDate}
                overlay={false}
              />
              <DatePicker
                key={`end-picker-${endDate}`}
                name="end-date-picker"
                currentDate={endDate}
                onSelect={this.handleSelectEndDate}
                overlay={false}
              />
          </StyledDatePickersContainer>
          </React.Fragment>
        )}
      </StyledContainer>
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

const StyledContainer = styled.div`
  position: relative;
`

const StyledBaseInput = styled(BaseInput)`
  color: #000000 !important;
`

const StyledDatePickersContainer = styled.div`
  position: absolute;
  display: flex;
  flex-direction: row;
  align-items: baseline;
  left: -250px;
  z-index: 1;
`

export default DateRangeInput
