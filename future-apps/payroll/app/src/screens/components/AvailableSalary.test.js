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

import AvailableSalary from './AvailableSalary'
import AragonContext from '../../context/AragonContext'

const dataMock = {
  AvailableSalary: [
  ]
}

afterEach(cleanup)

describe('Available Salary', () => {

  it('should render title', async () => {
    const { availableSalary } = renderAvailableSalary()
    const title = await availableSalary.container.querySelector('h1')
    expect(title).toHaveTextContent('Available Salary')
  })
})

function renderAvailableSalary (props) {
  const mockApp = {
    state () {
      return this
    },

    map () {
      return this
    },

    subscribe (cb) {
      cb(dataMock)
      return { unsubscribe: jest.fn() }
    }
  }

  const availableSalary = render(
    <AragonContext.Provider value={mockApp}>
      <AvailableSalary {...props} />
    </AragonContext.Provider>
  )

  return { availableSalary }
}
