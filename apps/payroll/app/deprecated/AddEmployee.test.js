/* eslint-env jest */

import React from 'react'
import { cleanup, fireEvent, render } from 'react-testing-library'
import { bindElementToQueries } from 'dom-testing-library'
import 'jest-dom/extend-expect'
import { format as formatDate } from 'date-fns'

import AddEmployeePanel from './AddEmployee'
import AragonContext from '../context/AragonContext'

import Factory from '../../test/factory'

const bodyUtils = bindElementToQueries(document.body)
const modalRoot = bodyUtils.getByTestId('modal-root')

afterEach(cleanup)

describe('Add new employee panel', () => {
  it('can be closed with the "x" button', () => {
    const onClose = jest.fn()
    const { buttons } = renderAddEmployeePanel({ onClose })

    expect(buttons.close).not.toBeNull()
    expect(buttons.close).toBeVisible()

    fireEvent.click(buttons.close)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('can be closed pressing ESC', () => {
    const onClose = jest.fn()
    const { form } = renderAddEmployeePanel({ onClose })

    fireEvent.keyDown(form, { key: 'Escape', keyCode: 27, which: 27 })

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  describe('Fields', () => {
    describe('Address field', () => {
      it('renders an alphanumeric input', () => {
        const { fields } = renderAddEmployeePanel()

        expect(fields.address).not.toBeNull()
        expect(fields.address).toBeVisible()
        expect(fields.address.type).toBe('text')
      })
    })

    describe('Name field', () => {
      it('renders an alphanumeric input', () => {
        const { fields } = renderAddEmployeePanel()

        expect(fields.name).not.toBeNull()
        expect(fields.name).toBeVisible()
        expect(fields.name.type).toBe('text')
      })
    })

    describe('Role field', () => {
      it('renders an alphanumeric input', () => {
        const { fields } = renderAddEmployeePanel()

        expect(fields.role).not.toBeNull()
        expect(fields.role).toBeVisible()
        expect(fields.role.type).toBe('text')
      })
    })

    describe('Salary field', () => {
      it('renders a numeric input', () => {
        const { fields } = renderAddEmployeePanel()

        expect(fields.salary).not.toBeNull()
        expect(fields.salary).toBeVisible()
        expect(fields.salary.type).toBe('number')
      })
    })

    describe('Start Date field', () => {
      it('renders an input', () => {
        const { fields } = renderAddEmployeePanel()

        expect(fields.startDate).not.toBeNull()
        expect(fields.startDate).toBeVisible()
      })

      it('is today by default', () => {
        const { fields } = renderAddEmployeePanel()
        const today = new Date()

        expect(fields.startDate.value).toBe(formatDate(today, 'LL/dd/yyyy'))
      })
    })
  })

  describe('Errors', () => {
    it('address is not valid message should be shown on invalid addresses input', () => {
      const { fields, buttons } = renderAddEmployeePanel()
      const { address, name, role, salary } = fields

      const account = Factory.createAccountArgs()

      // Fill in the Name field with a valid value
      fireEvent.change(name, { target: { value: account.name } })
      expect(name.value).toBe(account.name)

      // Fill in the Role field with a valid value
      fireEvent.change(role, { target: { value: account.role } })
      expect(role.value).toBe(account.role)

      // Fill in Salary field with a valid value
      const salaryAmount = '40000'
      fireEvent.change(salary, { target: { value: salaryAmount } })
      expect(salary.value).toBe(salaryAmount)

      // Fill in Address field with a valid value
      fireEvent.change(address, { target: { value: 'an invalid address' } })
      expect(address.value).toBe('an invalid address')

      fireEvent.click(buttons.submit)

      const errorBlock = modalRoot.querySelector(
        'div[name="validation-error-block"] span'
      )

      // Asserts the error message is shown
      expect(errorBlock).toHaveTextContent(
        'Address must be a valid ethereum address'
      )
    })

    it('address is taken message should be shown on an already used address input', () => {
      const { fields, buttons } = renderAddEmployeePanel()
      const { address, name, role, salary } = fields

      const account = Factory.createAccountArgs()

      // Fill in the Name field with a valid value
      fireEvent.change(name, { target: { value: account.name } })
      expect(name.value).toBe(account.name)

      // Fill in the Role field with a valid value
      fireEvent.change(role, { target: { value: account.role } })
      expect(role.value).toBe(account.role)

      // Fill in Salary field with a valid value
      const salaryAmount = '40000'
      fireEvent.change(salary, { target: { value: salaryAmount } })
      expect(salary.value).toBe(salaryAmount)

      // Fill in Address field with a valid value
      fireEvent.change(address, { target: { value: account.address } })
      expect(address.value).toBe(account.address)

      // Submits the form
      fireEvent.click(buttons.submit)

      const errorBlock = modalRoot.querySelector(
        'div[name="validation-error-block"] span'
      )

      // Asserts the error message is shown
      expect(errorBlock).toHaveTextContent('Address is taken')
    })
  })
})

function renderAddEmployeePanel(props) {
  const mockApp = {
    state() {
      return this
    },

    map() {
      return this
    },

    toPromise() {
      return []
    },

    subscribe(cb) {
      return { unsubscribe: jest.fn() }
    },
  }

  render(
    <AragonContext.Provider value={mockApp}>
      <AddEmployeePanel
        opened
        {...props}
        isAddressAvailable={address =>
          Factory.createInitialAccounts().every(e => e.address !== address)
        }
      />
    </AragonContext.Provider>
  )

  const panel = bindElementToQueries(modalRoot)
  const form = panel.getByTestId('add-employee-form')

  const fields = {
    address: panel.queryByLabelText('Address*'),
    name: panel.queryByLabelText('Name*'),
    role: panel.queryByLabelText('Role*'),
    salary: panel.queryByLabelText('Salary*'),
    startDate: panel.queryByLabelText('Start Date*'),
  }

  const buttons = {
    close: modalRoot.querySelector('button'),
    submit: modalRoot.querySelector('button[type="submit"]'),
  }

  return { form, fields, buttons }
}
