/* eslint-env jest */

import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  waitForElement
} from 'react-testing-library'
import { bindElementToQueries } from 'dom-testing-library'
import 'jest-dom/extend-expect'
import { format as formatDate } from 'date-fns'

const bodyUtils = bindElementToQueries(document.body)

import AddEmployeePanel from './AddEmployee'
import AragonContext from '../context/AragonContext'

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
    describe('Entity field', () => {
      it('renders a search input', () => {
        const { fields } = renderAddEmployeePanel()

        expect(fields.entity).not.toBeNull()
        expect(fields.entity).toBeVisible()
        expect(fields.entity.type).toBe('search')
      })

      it('allows to search for an entity', async () => {
        const { form, fields } = renderAddEmployeePanel()
        const searchText = 'protofire'

        expect(fields.entity.value).toBe('')

        // Enter search text into the field
        fireEvent.change(fields.entity, { target: { value: searchText } })

        // Wait until the suggestions appear
        const suggestion = await waitForElement(() =>
          form.querySelector('ul > li:first-child')
        )

        expect(suggestion).not.toBeNull()
        expect(suggestion).toHaveTextContent(
          'ProtoFire (protofire.aragonid.eth)'
        )

        // Select first suggestion
        fireEvent.click(suggestion)

        // Verify that the data for the selected entity is shown
        expect(fields.name).toHaveTextContent('ProtoFire')
        expect(fields.role).toHaveTextContent('Organization')
        expect(fields.accountAddress).toHaveTextContent(
          'xb4124cEB3451635DAcedd11767f004d8a28c6eE7'
        )
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

  describe('Validations', () => {
    it('entity field is required', async () => {
      const { fields, buttons, searchEntity } = renderAddEmployeePanel()

      expect(buttons.submit).toHaveAttribute('disabled')

      // Fill in Salary field with a valid value
      fireEvent.change(fields.salary, {
        target: { value: '40000' }
      })

      // Empty value for entity field
      expect(fields.entity.value).toBe('')
      expect(buttons.submit).toHaveAttribute('disabled')

      // Valid value for entity field
      const suggestion = await searchEntity('protofire.aragonid.eth')
      fireEvent.click(suggestion)

      expect(buttons.submit).not.toHaveAttribute('disabled')
    })

    it('allows only positive salaries', async () => {
      const { fields, buttons, searchEntity } = renderAddEmployeePanel()

      expect(buttons.submit).toHaveAttribute('disabled')

      // Fill in Entity field with a valid value
      const suggestion = await searchEntity('protofire.aragonid.eth')
      fireEvent.click(suggestion)

      expect(buttons.submit).toHaveAttribute('disabled')

      // Try with empty salary
      fireEvent.change(fields.salary, {
        target: { value: '' }
      })

      expect(fields.accountAddress).toHaveTextContent(
        'xb4124cEB3451635DAcedd11767f004d8a28c6eE7'
      )
      expect(buttons.submit).toHaveAttribute('disabled')

      // Try with negative salary
      fireEvent.change(fields.salary, {
        target: { value: '-40000' }
      })

      expect(buttons.submit).toHaveAttribute('disabled')

      // Try with salary equal to 0
      fireEvent.change(fields.salary, {
        target: { value: '0' }
      })

      expect(buttons.submit).toHaveAttribute('disabled')

      // Try with positive salary
      fireEvent.change(fields.salary, {
        target: { value: '40000' }
      })

      expect(buttons.submit).not.toHaveAttribute('disabled')
    })
  })
})

function renderAddEmployeePanel (props) {
  const mockApp = {
    state () {
      return this
    },

    map () {
      return this
    },

    toPromise () {
      return []
    },

    subscribe (cb) {
      return { unsubscribe: jest.fn() }
    }
  }

  render(
    <AragonContext.Provider value={mockApp}>
      <AddEmployeePanel opened {...props} />
    </AragonContext.Provider>
  )

  const modalRoot = bodyUtils.getByTestId('modal-root')
  const panel = bindElementToQueries(modalRoot)
  const form = panel.getByTestId('add-employee-form')

  const fields = {
    entity: panel.queryByLabelText('Entity'),
    salary: panel.queryByLabelText('Salary'),
    startDate: panel.queryByLabelText('Start Date'),

    // Static
    name: panel.queryByTestId('entity-name'),
    role: panel.queryByTestId('entity-role'),
    accountAddress: panel.queryByTestId('entity-account-address')
  }

  const buttons = {
    close: modalRoot.querySelector('button'),
    submit: modalRoot.querySelector('button[type="submit"]')
  }

  const searchEntity = searchText => {
    fireEvent.change(fields.entity, {
      target: { value: searchText }
    })

    return waitForElement(() => form.querySelector('ul > li:first-child'))
  }

  return { form, fields, buttons, searchEntity }
}
