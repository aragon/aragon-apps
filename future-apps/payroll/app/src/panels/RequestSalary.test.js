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
import { of } from '../rxjs'

import RequestSalaryPanel from './RequestSalary'
import AragonContext from '../context/AragonContext'

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

const mockState = {
  accountAddress: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
  denominationToken: {
    address: '0x3dEAc930Db4b27422Dce9Ee3F258DB9089C5c98e',
    decimals: 18,
    symbol: 'USD'
  },
  employees: [
    {
      accountAddress: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      accruedValue: 0,
      domain: 'protofire.aragonid.eth',
      endDate: null,
      id: '1',
      lastPayroll: 1542736089000,
      name: 'ProtoFire',
      role: 'Organization',
      salary: 2535047025122316,
      startDate: 1542736089000,
      terminated: false
    }
  ],
  priceFeedAddress: '0x79a8F61b0043f73DFD07A76c1f565332c9c4AfdC',
  salaryAllocation: [
    {
      address: '0xa0b8084BFa960F50E309c242e19417375b4c427c',
      allocation: 45,
      symbol: 'TK1'
    },
    {
      address: '0xb5c994DBaC8c086f574867D6791eb6F356141BA5',
      allocation: 55,
      symbol: 'TK2'
    }
  ],
  tokens: [
    {
      address: '0xa0b8084BFa960F50E309c242e19417375b4c427c',
      decimals: 18,
      symbol: 'TK1'
    },
    {
      address: '0xb5c994DBaC8c086f574867D6791eb6F356141BA5',
      decimals: 18,
      symbol: 'TK2'
    },
    {
      address: '0x6d8c9dE9b200cd050Cb0072CD24325c01DFddb4f',
      decimals: 18,
      symbol: 'TK3'
    }
  ]
}

const mockApp = {
  state () {
    return of(mockState)
  },

  external () {
    return {
      get () {
        return of({ xrt: 7500000000000000 })
      }
    }
  },

  payday () {
    return of(true)
  }
}

async function renderRequestPanel (props) {
  const requestSalary = render(
    <AragonContext.Provider value={mockApp}>
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
