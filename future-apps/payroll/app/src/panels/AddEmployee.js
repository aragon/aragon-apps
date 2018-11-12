import React from 'react'
import { createPortal } from 'react-dom'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { Button, Field, SidePanel } from '@aragon/ui'
import { startOfDay } from 'date-fns'

import Input from '../components/Input'
import AragonContext, { connect } from '../context/AragonContext'
import validator from '../data/validation'
import { toDecimals } from '../utils/math-utils'
import { SECONDS_IN_A_YEAR } from '../utils/formatting'

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

class AddEmployee extends React.PureComponent {
  static contextType = AragonContext

  static initialState = {
    entity: null,
    salary: null,
    startDate: startOfDay(new Date())
  }

  static validate = validator.compile({
    type: 'object',
    properties: {
      salary: {
        type: 'number',
        exclusiveMinimum: 0
      },
      startDate: {
        format: 'date',
        default: startOfDay(new Date())
      },
      entity: {
        type: 'object',
        properties: {
          name: {
            type: 'string'
          },
          role: {
            type: 'string'
          },
          accountAddress: {
            type: 'string',
            format: 'address'
          }
        },
        required: ['accountAddress']
      }
    },
    required: ['salary', 'startDate', 'entity']
  })

  state = AddEmployee.initialState

  componentDidUpdate (prevProps, prevState) {
    if (this.state !== prevState) {
      const state = { ...this.state }

      this.setState({
        ...state,
        isValid: AddEmployee.validate(state)
      })
    }
  }

  focusFirstEmptyField = () => {
    const { entity, salary } = this.state

    if (!entity) {
      this.entitySearch.input.focus()
    } else if (!salary) {
      this.salaryInput.focus()
    }
  }

  handleEntityChange = (accountAddress, entity) => {
    this.setState({ entity }, () => {
      this.focusFirstEmptyField()
    })
  }

  handleFormSubmit = (event) => {
    event.preventDefault()

    const { denominationToken } = this.props
    const { salary } = this.state
    const app = this.context

    if (app) {
      const accountAddress = this.state.entity.accountAddress
      const initialDenominationSalary = salary / SECONDS_IN_A_YEAR

      const adjustedAmount = toDecimals(initialDenominationSalary.toString(), denominationToken.decimals, {
        truncate: true
      })

      const name = this.state.entity.domain
      const startDate = Math.floor(this.state.startDate.getTime() / 1000)

      app.addEmployeeWithNameAndStartDate(
        accountAddress,
        adjustedAmount,
        name,
        startDate
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

  setEntitySearchRef = (el) => {
    this.entitySearch = el
  }

  setSalaryInputRef = (el) => {
    this.salaryInput = el
  }

  render () {
    const { opened, onClose } = this.props
    const { entity, salary, startDate, isValid } = this.state

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
          <Field label='Entity'>
            <Input.Entity
              ref={this.setEntitySearchRef}
              key={entity && entity.domain}
              value={entity && entity.domain}
              onChange={this.handleEntityChange}
            />
          </Field>

          <Field label='Salary'>
            <Input.Currency
              innerRef={this.setSalaryInputRef}
              value={salary || ''}
              onChange={this.handleSalaryChange}
            />
          </Field>

          <Field label='Start Date'>
            <Input.Date
              key={startDate}
              value={startDate}
              onChange={this.handleStartDateChange}
            />
          </Field>

          <Field label='Name'>
            <Input.Static>
              <span data-testid='entity-name'>
                {entity ? entity.name : ' '}
              </span>
            </Input.Static>
          </Field>

          <Field label='Role'>
            <Input.Static>
              <span data-testid='entity-role'>
                {entity ? entity.role : ' '}
              </span>
            </Input.Static>
          </Field>

          <Field label='Account Address'>
            <Input.Static>
              <span data-testid='entity-account-address'>
                {entity ? entity.accountAddress : ' '}
              </span>
            </Input.Static>
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

function mapStateToProps ({ denominationToken = {} }) {
  return {
    denominationToken
  }
}

export default connect(mapStateToProps)(AddEmployee)
