import React from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { format as formatDate } from 'date-fns'

import { TextInput } from '@aragon/ui'
import DatePicker from './DatePicker'
import { IconCalendar } from '../../Shared'

const Container = styled.div`
  width: 100%;
  position: relative;
`
const IconWrapper = styled.div`
  position: absolute;
  right: 12px;
  top: 12px;
  height: 14px;
`
const TextInputDate = styled(TextInput).attrs({
  readOnly: true
})`
  height: 40px;
  display: inline-block;
  padding-top: 3px;
  width: 100%;
`

class DateInput extends React.PureComponent {
  constructor(props) {
    super(props)

    this.setWrapperRef = this.setWrapperRef.bind(this)
    this.handleClickOutside = this.handleClickOutside.bind(this)
  }

  state = {
    showPicker: false,
    value: this.props.value
  }

  componentWillUnmount () {
    document.removeEventListener('mousedown', this.handleClickOutside)
  }

  componentDidMount() {
    document.addEventListener('mousedown', this.handleClickOutside)
  }

  setWrapperRef(node) {
    this.wrapperRef = node
  }

  handleClick = (event) => {
    event.stopPropagation()
    this.setState({ showPicker: true })
  }

  handleClickOutside = (event) => {
    if (this.wrapperRef && !this.wrapperRef.contains(event.target)) {
      this.setState({ showPicker: false })
    }
  }

  handleSelect = date => {
    this.props.onChange(date)
    this.setState({ showPicker: false })
  }

  render () {
    const { value } = this.props
    const formattedValue = formatDate(value, this.props.format)

    return (
      <Container
        ref={this.setWrapperRef}
      >
        <TextInputDate
          value={formattedValue}
          onClick={this.handleClick}
        />

        <IconWrapper onClick={this.handleClick}>
          <IconCalendar />
        </IconWrapper>

        {this.state.showPicker && (
          <DatePicker
            currentDate={value}
            onSelect={this.handleSelect}
            overlay={true}
          />
        )}
      </Container>
    )
  }
}

DateInput.propTypes = {
  format: PropTypes.string,
  onChange: PropTypes.func.isRequired,
  value: PropTypes.any
}

DateInput.defaultProps = {
  value: new Date(),
  format: 'LL/dd/yyyy',
  onChange: () => {}
}

export default DateInput
