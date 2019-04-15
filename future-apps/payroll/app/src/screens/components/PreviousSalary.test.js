/* eslint-env jest */

import React from 'react'
import {
  cleanup,
  fireEvent,
  render,
  waitForElement,
  queryByText,
} from 'react-testing-library'
import 'jest-dom/extend-expect'

import PreviousSalary from './PreviousSalary'
import AragonContext from '../../context/AragonContext'

const dataMock = {
  PreviousSalary: [],
}

afterEach(cleanup)

describe('Available Salary', () => {
  it('should render title', async () => {
    const { previousSalary } = renderPreviousSalary()
    const title = await previousSalary.container.querySelector('h1')
    expect(title).toHaveTextContent('Previous Salary')
  })
})

function renderPreviousSalary(props) {
  const mockApp = {
    state() {
      return this
    },

    map() {
      return this
    },

    subscribe(cb) {
      cb(dataMock)
      return { unsubscribe: jest.fn() }
    },
  }

  const previousSalary = render(
    <AragonContext.Provider value={mockApp}>
      <PreviousSalary {...props} />
    </AragonContext.Provider>
  )

  return { previousSalary }
}
