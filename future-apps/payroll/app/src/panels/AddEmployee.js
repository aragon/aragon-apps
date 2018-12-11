import React from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Button, Field, SidePanel, IconBlank } from '@aragon/ui'
import { startOfDay } from 'date-fns'

import Input from '../components/Input'
import { connect } from '../context/AragonContext'
import validator from '../data/validation'
import { toDecimals } from '../utils/math-utils'
import { SECONDS_IN_A_YEAR } from '../utils/formatting'

class AddEmployee extends React.PureComponent {
  static initialState = {
    address: '',
    name: '',
    role: '',
    salary: '',
    startDate: startOfDay(new Date())
  }

  static validate = validator.compile({
    type: 'object',
    properties: {
      address: {
        format: 'address'
      },
      name: {
        type: 'string',
        minLength: 3
      },
      role: {
        type: 'string',
        minLength: 3
      },
      salary: {
        type: 'number',
        exclusiveMinimum: 0
      },
      startDate: {
        format: 'date'
      }
    },
    required: ['salary', 'startDate', 'name', 'role', 'address']
  })

  state = AddEmployee.initialState

  componentDidUpdate (prevProps, prevState) {
    if (this.state !== prevState) {
      this.setState((state) => {
        const isValid = AddEmployee.validate(state)
        return {
          isValid
        }
      })
    }
  }

  focusFirstEmptyField = () => {
    const { address, name, role, salary } = this.state

    if (!address) {
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
    this.setState({ address: event.target.value })
  }

  handleNameChange = (event) => {
    this.setState({ name: event.target.value })
  }

  handleRoleChange = (event) => {
    this.setState({ role: event.target.value })
  }

  handleFormSubmit = (event) => {
    event.preventDefault()
    const { denominationToken, app, isAddressAvailable } = this.props
    const { address, name, salary, startDate } = this.state
    const _isAddressAvailable = isAddressAvailable(address)

    if (app && _isAddressAvailable) {
      const initialDenominationSalary = salary / SECONDS_IN_A_YEAR

      const adjustedAmount = toDecimals(initialDenominationSalary.toString(), denominationToken.decimals, {
        truncate: true
      })

      const _startDate = Math.floor(startDate.getTime() / 1000)

      app.addEmployeeWithNameAndStartDate(
        address,
        adjustedAmount,
        name,
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

  handleSalaryChange = (event) => {
    this.setState({ salary: event.target.value })
  }

  handleStartDateChange = (date) => {
    this.setState({ startDate: date })
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
    const { address, name, role, salary, startDate, isValid } = this.state
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
              value={address}
              onChange={this.handleAddressChange}
              icon={<IconBlank />}
              iconposition='right'
            />
          </Field>

          <Field label='Name'>
            <Input.Text
              innerRef={this.setNameInputRef}
              value={name}
              onChange={this.handleNameChange}
              icon={<IconBlank />}
            />
          </Field>

          <Field label='Role'>
            <Input.Text
              innerRef={this.setRoleInputRef}
              value={role}
              onChange={this.handleRoleChange}
              icon={<IconBlank />}
              iconposition='right'
            />
          </Field>

          <Field label='Salary'>
            <Input.Currency
              innerRef={this.setSalaryInputRef}
              value={salary}
              onChange={this.handleSalaryChange}
              icon={<IconBlank />}
            />
          </Field>

          <Field label='Start Date'>
            <Input.Date
              key={startDate}
              value={startDate}
              onChange={this.handleStartDateChange}
              icon={<IconBlank />}
              iconposition='right'
            />
          </Field>

          <Button type='submit' mode='strong' disabled={!isValid}>
            Add new employee
          </Button>
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

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 20px;

  > :first-child, > :nth-last-child(-n+1) {
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
