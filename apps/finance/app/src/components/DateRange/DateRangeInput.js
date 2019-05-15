import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import {
  isAfter,
  isBefore,
  isEqual,
  isDate,
  format as formatDate,
  startOfDay,
  endOfDay,
} from 'date-fns'
import { Button, breakpoint, font, theme, useViewport } from '@aragon/ui'
import IconCalendar from './Calendar'
import TextInput from './TextInput'
import DatePicker from './DatePicker'

const START_DATE = 'Start date'
const END_DATE = 'End date'

class DateRangeInput extends React.PureComponent {
  state = {
    showPicker: false,
    startDate: this.props.startDate,
    endDate: this.props.endDate,
    startPicker: null,
    endPicker: null,
    startDateSelected: false,
    endDateSelected: false,
  }

  get formattedStartDate() {
    const { startDate } = this.state

    return isDate(startDate) ? formatDate(startDate, this.props.format) : ''
  }

  get formattedEndDate() {
    const { endDate, startDate } = this.state
    const { format } = this.props

    return isDate(endDate) ? formatDate(endDate, format) : ''
  }

  componentWillUnmount() {
    document.removeEventListener('mousedown', this.handleClickOutside)
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.showPicker !== prevState.showPicker) {
      const { startDate, endDate, compactMode } = this.props
      // unsetting selection for compact because it shows one calendar at a time
      this.setState({
        startDateSelected: !compactMode && !!startDate,
        endDateSelected: !compactMode && !!endDate,
        startDate: !compactMode ? startDate : null,
        endDate: !compactMode ? endDate : null,
      })
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

  handleSelectStartDate = date => {
    const { endDate } = this.state
    const isValidDate =
      !endDate || isBefore(date, endDate) || isEqual(date, endDate)
    if (isValidDate) {
      this.setState({ startDateSelected: true, startDate: startOfDay(date) })
    }
  }

  handleSelectEndDate = date => {
    const { startDate } = this.state
    const isValidDate =
      !startDate || isAfter(date, startDate) || isEqual(date, startDate)
    if (isValidDate) {
      this.setState({ endDateSelected: true, endDate: endOfDay(date) })
    }
  }

  handleApply = e => {
    e.preventDefault()
    e.stopPropagation()
    this.setState({ showPicker: false })
    const { startDate, endDate } = this.state
    if (startDate && endDate) {
      this.props.onChange({
        start: startOfDay(startDate),
        end: endOfDay(endDate),
      })
    }
  }

  handleClear = e => {
    e.preventDefault()
    e.stopPropagation()
    this.setState({ showPicker: false, startDate: null, endDate: null })
    this.props.onChange({
      start: null,
      end: null,
    })
  }

  getValueText = () => {
    const {
      compactMode,
      format,
      startDate: startDateProps,
      endDate: endDateProps,
    } = this.props
    const { showPicker, startDateSelected, endDateSelected } = this.state

    // closed
    // shows props, if props null then placeholder
    if (!showPicker) {
      return startDateProps && endDateProps
        ? `${formatDate(startDateProps, format)} | ${formatDate(
            endDateProps,
            format
          )}`
        : ''
    }

    // opened
    //  shows constants, till dates selected
    if (compactMode) {
      return `${startDateSelected ? this.formattedStartDate : START_DATE} | ${
        endDateSelected ? this.formattedEndDate : END_DATE
      }`
    }

    //  shows props, changes with selection
    return `${
      this.formattedStartDate ? this.formattedStartDate : START_DATE
    } | ${this.formattedEndDate ? this.formattedEndDate : END_DATE}`
  }

  render() {
    const {
      startDate,
      endDate,
      startDateSelected,
      endDateSelected,
      showPicker,
    } = this.state
    const { compactMode } = this.props

    const icon = this.state.showPicker ? (
      <IconCalendarSelected />
    ) : (
      <IconCalendar />
    )

    return (
      <StyledContainer
        ref={el => (this.rootRef = el)}
        onClick={this.handleClick}
      >
        <StyledTextInput
          value={this.getValueText()}
          readOnly
          adornment={icon}
          adornmentPosition="end"
          height={39}
          placeholder={`${START_DATE} | ${END_DATE}`}
        />
        {this.state.showPicker && (
          <Container>
            <Wrap>
              {(!compactMode || !startDateSelected) && (
                <DatePicker
                  key={`start-picker-${startDate}`}
                  name="start-date-picker"
                  currentDate={startDate}
                  onSelect={this.handleSelectStartDate}
                  overlay={false}
                />
              )}
              {(!compactMode || startDateSelected) && (
                <DatePicker
                  key={`end-picker-${endDate}`}
                  name="end-date-picker"
                  currentDate={endDate}
                  onSelect={this.handleSelectEndDate}
                  overlay={false}
                />
              )}
            </Wrap>

            <Controls>
              <Button
                css="width: 124px"
                mode="outline"
                onClick={this.handleClear}
              >
                Clear
              </Button>
              <Button
                css={`
                  width: 124px;

                  ${breakpoint(
                    'medium',
                    `
                      margin-left: 19px;
                    `
                  )}
                `}
                mode="strong"
                onClick={this.handleApply}
                disabled={!startDateSelected || !endDateSelected}
              >
                Apply
              </Button>
            </Controls>
          </Container>
        )}
      </StyledContainer>
    )
  }
}

DateRangeInput.propTypes = {
  endDate: PropTypes.instanceOf(Date),
  format: PropTypes.string,
  onChange: PropTypes.func,
  startDate: PropTypes.instanceOf(Date),
}

DateRangeInput.defaultProps = {
  format: 'LL/dd/yyyy',
  onChange: () => {},
}

const Controls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 16px 0;
  padding: 0 8px;

  ${breakpoint(
    'medium',
    `
      display: block;
      text-align: right;
    `
  )}
`

const StyledContainer = styled.div`
  position: relative;
`

const StyledTextInput = styled(TextInput)`
  width: 28ch;
  ${font({ monospace: true })};
`

const Wrap = styled.div`
  > div {
    border: 0;
    box-shadow: none;
  }

  ${breakpoint(
    'medium',
    `
      display: flex;
      flex-direction: row;
      align-items: baseline;
    `
  )}
`

const Container = styled.div`
  position: absolute;
  z-index: 10;
  border: 1px solid ${theme.contentBorder};
  border-radius: 3px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
  background: #fff;
`

const IconCalendarSelected = styled(IconCalendar)`
  color: ${theme.accent};
`

export default props => {
  const { below } = useViewport()
  return <DateRangeInput {...props} compactMode={below('medium')} />
}
