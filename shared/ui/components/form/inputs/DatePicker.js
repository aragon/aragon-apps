import React from 'react'
import PropTypes from 'prop-types'
import styled, { css } from 'styled-components'
import { Button, Text, theme } from '@aragon/ui'
import {
  addMonths,
  addYears,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format as formatDate,
  isSameDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subYears
} from 'date-fns'

const mainColor = '#30D9D4'

const Container = styled.div`
  display: grid;
  min-width: 15em;
  margin: 0 auto;
  padding-top: 0.5em;
  background: ${theme.contentBackground};
  border: 1px solid ${theme.contentBorder};
  border-radius: 3px;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.06);

  ${props => props.overlay && css`
    &&& {
      position: absolute;
      ${props => props.verticalAlign === 'top' && css`
        top:40px;
      `}
      ${props => props.verticalAlign === 'bottom' && css`
        bottom: 40px;
      `}
      ${props => props.horizontalAlign === 'left' && css`
        left:0;
      `}
      ${props => props.horizontalAlign === 'right' && css`
        right: 0;
      `}
      z-index: 10;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
    }
  `}
`

const Selector = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const ArrowButton = styled(Button.Anchor)`
  font-size: 60%;
  color: ${theme.contentBorder};

  &:hover {
    border: none;
    box-shadow: none;
    color: inherit;
  }
`

const MonthView = styled.ol`
  margin: 0;
  padding: 0.5em;
  display: grid;
  grid-gap: 0.25em;
  grid-template: auto / repeat(7, 1fr);
  list-style: none;
`

const DayView = styled.li`
  position: relative;
  width: 2.571em;
  height: 2.571em;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  cursor: pointer;
  font-size: 90%;
  user-select: none;

  ${props => props.today && css`
    border: 1px solid ${theme.disabled};
  `}

  ${props => props.disabled && css`
    pointer-events: none;
    color: ${theme.disabled};
  `}

  ${props => props.selected && css`
    &&& {
      background: ${mainColor};
      border-color: ${mainColor};
      color: ${theme.negativeText};
    }
  `}

  &:after {
    display: block;
    content: '';
    margin-top: 100%;
  }

  &:hover {
    background: ${theme.contentBackgroundActive};
  }
`

const WeekDay = styled(DayView)`
  pointer-events: none;
  color: ${theme.textTertiary};
  text-transform: uppercase;
`

class DatePicker extends React.PureComponent {
  state = {
    value: this.props.currentDate || new Date()
  }

  handleSelection = (date) => (event) => {
    event.preventDefault()

    if (typeof this.props.onSelect === 'function') {
      this.props.onSelect(date)
    }
  }

  nextMonth = (event) => {
    event.stopPropagation()

    this.setState({
      value: addMonths(startOfMonth(this.state.value), 1)
    })
  }

  nextYear = (event) => {
    event.stopPropagation()

    this.setState({
      value: addYears(startOfMonth(this.state.value), 1)
    })
  }

  previousMonth = (event) => {
    event.stopPropagation()

    this.setState({
      value: subMonths(startOfMonth(this.state.value), 1)
    })
  }

  previousYear = (event) => {
    event.stopPropagation()

    this.setState({
      value: subYears(startOfMonth(this.state.value), 1)
    })
  }

  render () {
    const today = startOfDay(new Date())
    const { value: selected = today } = this.state

    return (
      <Container
        overlay={this.props.overlay}
        horizontalAlign={this.props.horizontalAlign}
        verticalAlign={this.props.verticalAlign}
      >
        {!this.props.hideYearSelector && (
          <Selector>
            <ArrowButton onClick={this.previousYear}>
              ◀
            </ArrowButton>
            <Text size='normal'>
              {formatDate(selected, this.props.yearFormat)}
            </Text>
            <ArrowButton onClick={this.nextYear}>
              ▶
            </ArrowButton>
          </Selector>
        )}

        {!this.props.hideMonthSelector && (
          <Selector>
            <ArrowButton onClick={this.previousMonth}>
              ◀
            </ArrowButton>
            <Text size='large' weight='bold'>
              {formatDate(selected, !this.props.hideYearSelector
                ? this.props.monthFormat
                : this.props.monthYearFormat
              )}
            </Text>
            <ArrowButton onClick={this.nextMonth}>
              ▶
            </ArrowButton>
          </Selector>
        )}

        <MonthView>
          {!this.props.hideWeekDays && eachDayOfInterval({
            start: startOfWeek(selected),
            end: endOfWeek(selected)
          }).map(day => (
            <WeekDay key={formatDate(day, 'eeeeee')}>
              <Text size='xsmall'>
                {formatDate(day, this.props.weekDayFormat)}
              </Text>
            </WeekDay>
          ))}

          {eachDayOfInterval({
            start: startOfWeek(startOfMonth(selected)),
            end: endOfWeek(endOfMonth(selected))
          }).map(day => (
            <DayView
              key={day.getTime()}
              disabled={selected.getMonth() !== day.getMonth()}
              selected={isSameDay(day, this.props.currentDate)}
              today={isSameDay(day, today)}
              onClick={this.handleSelection(day)}
            >
              <Text size='small'>
                {formatDate(day, this.props.dayFormat)}
              </Text>
            </DayView>
          ))}
        </MonthView>
      </Container>
    )
  }
}

DatePicker.propTypes = {
  currentDate: PropTypes.instanceOf(Date),

  // Events
  onSelect: PropTypes.func,

  // Visibility
  hideMonthSelector: PropTypes.bool,
  hideWeekDays: PropTypes.bool,
  hideYearSelector: PropTypes.bool,
  overlay: PropTypes.bool,

  // Formatting
  dayFormat: PropTypes.string,
  monthFormat: PropTypes.string,
  monthYearFormat: PropTypes.string,
  weekDayFormat: PropTypes.string,
  yearFormat: PropTypes.string,

  // Positioning
  horizontalAlign: PropTypes.string,
  verticalAlign: PropTypes.string,
}

DatePicker.defaultProps = {
  onSelect: () => {},
  dayFormat: 'd',
  monthFormat: 'MMMM',
  monthYearFormat: 'MMMM yyyy',
  weekDayFormat: 'eee',
  yearFormat: 'yyyy',
  horizontalAlign: 'right',
  verticalAlign: 'top',
}

export default DatePicker
