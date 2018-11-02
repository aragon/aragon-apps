/* eslint-env jest */

import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  waitForElement,
  queryByText
} from 'react-testing-library'
import 'jest-dom/extend-expect'

import SalaryAllocation from './SalaryAllocation'
import AragonContext from '../../context/AragonContext'

const dataMock = [
  { symbol: 'TK1', allocation: 30 },
  { symbol: 'TK2', allocation: 70 }
]

afterEach(cleanup)

fdescribe('Salary allocation side panel', () => {
  const { salaryAllocation } = renderSalaryAllocation()

  it('should render salary allocation legends', async () => {
    const { salaryAllocation } = renderSalaryAllocation()
    const list = await salaryAllocation.container.querySelectorAll('li')
    expect(list).toHaveLength(2)

    dataMock.forEach(({ symbol, allocation }) => {
      const bySymbol = salaryAllocation.queryByText(symbol)
      const byAllocation = salaryAllocation.queryByText(`${allocation}%`)
      expect(bySymbol).not.toBeNull()
      expect(byAllocation).not.toBeNull()
    })
  })

  it('should render edit button', async () => {
    const { salaryAllocation } = renderSalaryAllocation()
    const button = salaryAllocation.queryByTestId('salary-allocation-edit-btn')

    expect(button).not.toBeNull()
    expect(button).toBeVisible()
    expect(button).toHaveTextContent('Edit salary allocation')
  })
})

function renderSalaryAllocation (props) {
  const mockApp = {
    state () {
      return this
    },

    first () {
      return this
    },

    pluck () {
      return this
    },

    subscribe (cb) {
      cb(dataMock)
      return { unsubscribe: jest.fn() }
    }
  }

  const salaryAllocation = render(
    <AragonContext.Provider value={mockApp}>
      <SalaryAllocation {...props} />
    </AragonContext.Provider>
  )

  return { salaryAllocation }
}
