import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { useAppState } from '@aragon/api-react'
import {
  Button,
  Field,
  IconBlank,
  IconCross,
  SidePanel,
  Text,
  TextInput,
} from '@aragon/ui'
import BN from 'bn.js'
import { startOfDay } from 'date-fns'

import { useAddEmployeeAction } from '../app-logic'
import Input from '../components/Input'
import validator from '../data/validation'
import { TokenType } from '../types'
import { SECONDS_IN_A_YEAR } from '../utils/time'
import { addressesEqual } from '../utils/web3'

const NO_ERROR = Symbol('NO_ERROR')
const ADDRESS_NOT_AVAILABLE_ERROR = Symbol('ADDRESS_NOT_AVAILABLE_ERROR')
const ADDRESS_INVALID_FORMAT = Symbol('ADDRESS_INVALID_FORMAT')
const FORM_MISSING_FIELDS = Symbol('FORM_MISSING_FIELDS')

const AddEmployee = React.memo(({ panelState }) => {
  const handleAddEmployee = useAddEmployeeAction(panelState.requestClose)
  const { denominationToken, employees } = useAppState()
  const isEmployeeAddressAvailable = useCallback(
    address =>
      employees.every(
        employee => !addressesEqual(employee.accountAddress, address)
      ),
    [employees]
  )

  return (
    <SidePanel
      title="Add new employee"
      opened={panelState.visible}
      onClose={panelState.requestClose}
      onTransitionEnd={panelState.onTransitionEnd}
    >
      <AddEmployeeContent
        denominationToken={denominationToken}
        isEmployeeAddressAvailable={isEmployeeAddressAvailable}
        onAddEmployee={handleAddEmployee}
        panelOpened={panelState.didOpen}
      />
    </SidePanel>
  )
})

const validateFormAddress = validator.compile({
  type: 'object',
  properties: {
    address: {
      format: 'address',
    },
  },
  required: ['address'],
})
const validateForm = validator.compile({
  type: 'object',
  properties: {
    role: {
      type: 'string',
    },
    salary: {
      type: 'number',
      exclusiveMinimum: 0,
    },
    startDate: {
      format: 'date',
    },
  },
  required: ['salary', 'startDate', 'role'],
})

const initialFormState = {
  error: NO_ERROR,
  address: '',
  role: '',
  salary: '',
  startDate: startOfDay(new Date()),
}

class AddEmployeeContent extends React.PureComponent {
  static propTypes = {
    denominationToken: TokenType,
    isEmployeeAddressAvailable: PropTypes.func.isRequired,
    onAddEmployee: PropTypes.func.isRequired,
    panelOpened: PropTypes.bool,
  }
  state = { ...initialFormState }
  _addressInput = React.createRef()
  _roleInput = React.createRef()
  _salaryInput = React.createRef()

  componentWillReceiveProps({ panelOpened }) {
    if (panelOpened && !this.props.panelOpened) {
      // setTimeout is needed as a small hack to wait until the inputs are on
      // screen until we call focus
      setTimeout(() => this.focusFirstEmptyField(), 0)
    } else if (!panelOpened && this.props.panelOpened) {
      // Finished closing the panel, so reset its state
      this.setState({ ...initialFormState })
    }
  }

  focusFirstEmptyField = () => {
    const { address, role, salary } = this.state

    let input
    if (!address) {
      input = this._addressInput.current
    } else if (!role) {
      input = this._roleInput.current
    } else if (!salary) {
      input = this._salaryInput.current
    }

    // Focus if the input element exists
    input && input.current && input.current.focus()
  }

  handleAddressChange = event => {
    this.setState({ address: event.target.value })
    this.resetError()
  }

  handleRoleChange = event => {
    this.setState({ role: event.target.value })
    this.resetError()
  }

  handleSalaryChange = event => {
    this.setState({ salary: event.target.value })
    this.resetError()
  }

  handleStartDateChange = date => {
    this.setState({ startDate: date })
    this.resetError()
  }

  handleFormSubmit = event => {
    event.preventDefault()
    const {
      denominationToken,
      isEmployeeAddressAvailable,
      onAddEmployee,
    } = this.props
    const { address, salary, role, startDate } = this.state

    // Form validation
    if (!validateFormAddress(this.state)) {
      this.setState({
        error: ADDRESS_INVALID_FORMAT,
      })
    }
    if (!isEmployeeAddressAvailable(address)) {
      this.setState({
        error: ADDRESS_NOT_AVAILABLE_ERROR,
      })
    }
    if (!validateForm(this.state)) {
      this.setState({
        error: FORM_MISSING_FIELDS,
      })
      return
    }

    // Adjust for denomination token base and use per second version
    const denominationTokenBase = new BN(10).pow(denominationToken.decimals)
    const salaryPerSecond = new BN(salary)
      .mul(denominationTokenBase)
      .div(SECONDS_IN_A_YEAR)
      .toString()
    const startDateInSeconds = Math.floor(startDate.getTime() / 1000)

    onAddEmployee(address, salaryPerSecond, startDateInSeconds, role)
  }

  resetError() {
    this.setState({
      error: NO_ERROR,
    })
  }

  // TODO: replace IconBlank with appropriate icons
  render() {
    const { denominationToken } = this.props
    const { address, error, role, salary, startDate } = this.state

    let errorMessage
    if (error === ADDRESS_INVALID_FORMAT) {
      errorMessage = 'Address must be a valid ethereum address'
    } else if (error === ADDRESS_NOT_AVAILABLE_ERROR) {
      errorMessage = 'Address is already in use by another employee'
    }

    return (
      <Form onSubmit={this.handleFormSubmit}>
        <Field label="Address">
          <TextInput
            ref={this._addressInput}
            value={address.value}
            onChange={this.handleAddressChange}
            required
            wide
          />
        </Field>

        <Field label="Role">
          <TextInput
            ref={this._roleInput}
            value={role}
            onChange={this.handleRoleChange}
            min={0}
            step={1000}
            required
            wide
          />
        </Field>

        <Field label="Yearly Salary">
          <TextInput.Number
            ref={this._salaryInput}
            value={salary}
            onChange={this.handleSalaryChange}
            adornment={denominationToken.symbol}
            adornmentPosition="end"
            required
          />
        </Field>

        <Field label="Start Date">
          <Input.Date
            key={startDate}
            value={startDate}
            onChange={this.handleStartDateChange}
            icon={<IconBlank />}
            iconposition="right"
            required
          />
        </Field>

        <Button mode="strong" type="submit" wide>
          Add new employee
        </Button>

        {errorMessage && <ValidationError message={errorMessage} />}
      </Form>
    )
  }
}

const ValidationError = ({ message }) => (
  <div css="margin-top: 15px">
    <IconCross />
    <Text size="small" css="margin-left: 10px">
      {message}
    </Text>
  </div>
)

const Form = styled.form`
  display: grid;
  grid-template-columns: 1fr 1fr;
  column-gap: 20px;

  > :first-child,
  > :nth-last-child(-n + 2) {
    grid-column: span 2;
  }

  > :last-child {
    margin-top: 20px;
  }
`

export default AddEmployee
