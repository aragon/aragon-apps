/* eslint-env jest */

import React from 'react'
import {
  cleanup,
  // fireEvent,
  render,
  waitForElement
} from 'react-testing-library'
import { bindElementToQueries } from 'dom-testing-library'
import 'jest-dom/extend-expect'

import RequestSalaryPanel from './RequestSalary'
import AragonContext from '/context/AragonContext'

import mockApp from 'mocks'

const bodyUtils = bindElementToQueries(document.body)

afterEach(cleanup)

describe('Request Salary panel', () => {
  it('should have the right title', async () => {
    const onClose = jest.fn()
    const { title } = await renderRequestPanel({ onClose })

    expect(title).not.toBeNull()
    expect(title).toBeVisible()
    expect(title).toHaveTextContent('Request salary')
  })

  it('should show token amount and propotion for each token in salary allocation', async () => {
    const onClose = jest.fn()
    const { requestSalary } = await renderRequestPanel({ onClose })

    const tokens = ['TK1', 'TK2']

    tokens.forEach(token => {
      const tokenAmount = requestSalary.getByTestId(`token-allocation-${token}`)
      const propotion = requestSalary.getByTestId(
        `proportion-allocation-${token}`
      )

      expect(tokenAmount).not.toBeNull()
      expect(tokenAmount).toHaveTextContent(new RegExp(`.*${token}$`))

      expect(propotion).not.toBeNull()
      expect(propotion).toHaveTextContent(/.*USD$/)
    })
  })

  it('should show an Edit salary allocation btn', async () => {
    const onClose = jest.fn()
    const { buttons } = await renderRequestPanel({ onClose })

    expect(buttons.edit).not.toBeNull()
    expect(buttons.edit).toBeVisible()
  })

  it('should show Request Salary btn', async () => {
    const onClose = jest.fn()
    const { buttons } = await renderRequestPanel({ onClose })

    expect(buttons.request).not.toBeNull()
    expect(buttons.request).toBeVisible()
  })
})

async function renderRequestPanel (props) {
  const app = mockApp()

  const requestSalary = render(
    <AragonContext.Provider value={app}>
      <RequestSalaryPanel opened {...props} />
    </AragonContext.Provider>
  )

  const modalRoot = bodyUtils.getByTestId('modal-root')
  const panel = bindElementToQueries(modalRoot)

  await waitForElement(() => panel.getByTestId('total-salary'))

  const buttons = {
    close: modalRoot.querySelector('button'),
    edit: panel.getByTestId('salary-allocation-edit-btn'),
    request: panel.getByTestId('request-payment-btn')
  }

  const title = modalRoot.querySelector('h1')

  return { requestSalary, buttons, title }
}
