import React from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Button, Field, IconBlank, SidePanel, Text } from '@aragon/ui'
import { startOfDay } from 'date-fns'

import Input from '../components/Input'
import { connect } from '../context/AragonContext'
import validator from '../data/validation'
import { toDecimals } from '../utils/math-utils'
import { SECONDS_IN_A_YEAR } from '../utils/formatting'

const NO_ERROR = Symbol('NO_ERROR')
const ADDRESS_NOT_AVAILABLE_ERROR = Symbol('ADDRESS_NOT_AVAILABLE_ERROR')
const ADDRESS_INVALID_FORMAT = Symbol('ADDRESS_INVALID_FORMAT')

class AddEmployee extends React.PureComponent {
  static initialState = {
    address: {
      value: '',
      error: NO_ERROR
    },
    name: '',
    role: '',
    salary: '',
    startDate: startOfDay(new Date())
  }

  static validate = validator.compile({
    type: 'object',
    properties: {
      name: {
        type: 'string'
      },
      role: {
        type: 'string'
      },
      salary: {
        type: 'number',
        exclusiveMinimum: 0
      },
      startDate: {
        format: 'date'
      }
    },
    required: ['salary', 'startDate', 'name', 'role']
  })

  static validateAddress = validator.compile({
    type: 'object',
    properties: {
      value: {
        format: 'address'
      }
    },
    required: ['value']
  })

  state = AddEmployee.initialState

  focusFirstEmptyField = () => {
    const { address, name, role, salary } = this.state

    if (!address.value) {
      this.address.input.focus()
    } else if (!name) {
      this.nameInput.input.focus()
    } else if (!role) {
      this.roleInput.input.focus()
    } else if (!salary) {
      this.salaryInput.input.focus()
    }
  }

  handleAddressChange = (event) => {
    const error = NO_ERROR
    const value = event.target.value
    this.setState({
      address: {
        value,
        error
      }
    })
  }

  handleNameChange = (event) => {
    this.setState({ name: event.target.value })
  }

  handleRoleChange = (event) => {
    this.setState({ role: event.target.value })
  }

  handleSalaryChange = (event) => {
    this.setState({ salary: event.target.value })
  }

  handleStartDateChange = (date) => {
    this.setState({ startDate: date })
  }

  handleFormSubmit = (event) => {
    event.preventDefault()
    const { denominationToken, app, isAddressAvailable } = this.props
    const { address, name, salary, role, startDate } = this.state
    const _address = address.value
    const _isValidAddress = AddEmployee.validateAddress(address)
    const _isAddressAvailable = isAddressAvailable(_address)

    if (!_isValidAddress) {
      this.setState(({ address }) => ({
        address: {
          ...address,
          error: ADDRESS_INVALID_FORMAT
        }
      }))
      return
    }

    if (!_isAddressAvailable) {
      this.setState(({ address }) => ({
        address: {
          ...address,
          error: ADDRESS_NOT_AVAILABLE_ERROR
        }
      }))
      return
    }

    const isValidForm = AddEmployee.validate(this.state)

    if (app && isValidForm) {
      const initialDenominationSalary = salary / SECONDS_IN_A_YEAR

      const adjustedAmount = toDecimals(initialDenominationSalary.toString(), denominationToken.decimals, {
        truncate: true
      })

      const _startDate = Math.floor(startDate.getTime() / 1000)

      app.addEmployee(
        _address,
        adjustedAmount,
        name,
        role,
        _startDate
      ).subscribe(employee => {
        if (employee) {
          // Reset form data
          this.setState(AddEmployee.initialState)

          // Close side panel
          this.props.onClose()
        }
      })
    }
  }

  handlePanelToggle = (opened) => {
    if (opened) { // When side panel is shown
      this.focusFirstEmptyField()
    }
  }

  setAddressRef = (el) => {
    this.address = el
  }

  setNameInputRef = (el) => {
    this.nameInput = el
  }

  setRoleInputRef = (el) => {
    this.roleInput = el
  }

  setSalaryInputRef = (el) => {
    this.salaryInput = el
  }

  render () {
    const { opened, onClose } = this.props
    const { address, name, role, salary, startDate } = this.state

    let errorMessage
    if (address.error === ADDRESS_INVALID_FORMAT) {
      errorMessage = 'Address must be a valid ethereum address'
    } else if (address.error === ADDRESS_NOT_AVAILABLE_ERROR) {
      errorMessage = 'Address is taken'
    }

    const panel = (
      <SidePanel
        title='Add new employee'
        opened={opened}
        onClose={onClose}
        onTransitionEnd={this.handlePanelToggle}
      >
        <Form
          onSubmit={this.handleFormSubmit}
          data-testid='add-employee-form'
        >

          <Field label='Address'>
            <Input.Text
              innerRef={this.setAddressRef}
              value={address.value}
              onChange={this.handleAddressChange}
              required
            />
          </Field>

          <Field label='Name'>
            <Input.Text
              innerRef={this.setNameInputRef}
              value={name}
              onChange={this.handleNameChange}
              required
            />
          </Field>

          <Field label='Role'>
            <Input.Text
              innerRef={this.setRoleInputRef}
              value={role}
              onChange={this.handleRoleChange}
              required
            />
          </Field>

          <Field label='Salary'>
            <Input.Currency
              innerRef={this.setSalaryInputRef}
              value={salary}
              onChange={this.handleSalaryChange}
              icon={<IconBlank />}
              required
            />
          </Field>

          <Field label='Start Date'>
            <Input.Date
              key={startDate}
              value={startDate}
              onChange={this.handleStartDateChange}
              icon={<IconBlank />}
              iconposition='right'
              required
            />
          </Field>

          <Button type='submit' mode='strong'>
            Add new employee
          </Button>
          <Messages>
            {errorMessage && <ValidationError message={errorMessage} />}
          </Messages>
        </Form>
      </SidePanel>
    )

    return createPortal(
      panel,
      document.getElementById('modal-root')
    )
  }
}

AddEmployee.propsType = {
  onClose: PropTypes.func,
  opened: PropTypes.bool
}

// TODO: replace IconBlank with IconCross - sgobotta
const ValidationError = ({ message }) => (
  <ValidationErrorBlock name='validation-error-block'>
    <StyledIconBlank />
    <StyledText size='small'>
      {message}
    </StyledText>
  </ValidationErrorBlock>
)

const StyledIconBlank = styled(IconBlank)`
  color: red;
`

const StyledText = styled(Text)`
  position: relative;
  bottom: 6px;
  margin-left: 10px;
`

const Messages = styled.div`
  margin-top: 15px;
`

const ValidationErrorBlock = styled.div`
  margin-top: 15px;
`

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 20px;

  > :first-child, > :nth-last-child(-n+2) {
    grid-column: span 2;
  }

  > :last-child {
    margin-top: 20px;
  }
`

function mapStateToProps ({ denominationToken = {}, employees = [] }) {
  return {
    denominationToken,
    isAddressAvailable: (address) => employees.every(employee => employee.accountAddress !== address)
  }
}

export default connect(mapStateToProps)(AddEmployee)
