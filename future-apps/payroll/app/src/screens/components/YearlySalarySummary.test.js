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
import { of } from '../../rxjs'

import YearlySalarySummary from './YearlySalarySummary'
import AragonContext from '../../context/AragonContext'

const bodyUtils = bindElementToQueries(document.body)

afterEach(cleanup)

describe('Request Salary panel', () => {
  it('should have the right titles', async () => {
    const { titles } = await renderSummary()

    expect(titles.summary).not.toBeNull()
    expect(titles.year).not.toBeNull()
    expect(titles.remaining).not.toBeNull()
    expect(titles.bill).not.toBeNull()
    expect(titles.reserves).not.toBeNull()

    expect(titles.summary).toBeVisible()
    expect(titles.year).toBeVisible()
    expect(titles.remaining).toBeVisible()
    expect(titles.bill).toBeVisible()
    expect(titles.reserves).toBeVisible()

    expect(titles.summary).toHaveTextContent('Yearly salary summary')
    expect(titles.year).toHaveTextContent('Salary paid this year')
    expect(titles.remaining).toHaveTextContent('Remaining salary this year')
    expect(titles.bill).toHaveTextContent('Total year salary bill')
    expect(titles.reserves).toHaveTextContent('Cash reserves')
  })

  it('should have the right amounts', async () => {
    const { amounts } = await renderSummary()

    expect(amounts.year).not.toBeNull()
    expect(amounts.remaining).not.toBeNull()
    expect(amounts.bill).not.toBeNull()
    expect(amounts.reserves).not.toBeNull()

    expect(amounts.year).toBeVisible()
    expect(amounts.remaining).toBeVisible()
    expect(amounts.bill).toBeVisible()
    expect(amounts.reserves).toBeVisible()

    expect(amounts.year).toHaveTextContent('440.72 USD')
    expect(amounts.remaining).toHaveTextContent('399,559.28 USD')
    expect(amounts.bill).toHaveTextContent('400,000 USD')
    expect(amounts.reserves).toHaveTextContent('+6,937.98 USD')
  })
})

const mockState = {
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
      lastPayroll: 1543930644000,
      name: 'ProtoFire',
      role: 'Organization',
      salary: 2535047025122316,
      startDate: 1543754816000,
      terminated: false
    },
    {
      accountAddress: '0x8401Eb5ff34cc943f096A32EF3d5113FEbE8D4Eb',
      accruedValue: 0,
      domain: 'leolower.protofire.eth',
      endDate: null,
      id: '2',
      lastPayroll: 1543841216000,
      name: 'Leonardo Lower',
      role: 'Project Manager',
      salary: 2851927903262605,
      startDate: 1543841216000,
      terminated: false
    },
    {
      accountAddress: '0x306469457266CBBe7c0505e8Aad358622235e768',
      accruedValue: 0,
      domain: 'lmcorbalan.protofire.eth',
      endDate: null,
      id: '3',
      lastPayroll: 1543754816000,
      name: 'Lisandro Corbalan',
      role: 'Developer',
      salary: 3168808781402895,
      startDate: 1543754816000,
      terminated: false
    },
    {
      accountAddress: '0xd873F6DC68e3057e4B7da74c6b304d0eF0B484C7',
      accruedValue: 0,
      domain: 'sistemico.protofire.eth',
      endDate: null,
      id: '4',
      lastPayroll: 1543754816000,
      name: 'Sebastián Galiano',
      role: 'Developer',
      salary: 2218166146982026,
      startDate: 1543754816000,
      terminated: false
    },
    {
      accountAddress: '0xDcC5dD922fb1D0fd0c450a0636a8cE827521f0eD',
      accruedValue: 0,
      domain: 'fernando.greco.protofire.eth',
      endDate: null,
      id: '5',
      lastPayroll: 1543754816000,
      name: 'Fernando Greco',
      role: 'Developer',
      salary: 1901285268841737,
      startDate: 1543754816000,
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
  ],
  payments: [
    {
      accountAddress: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      amount: {
        amount: '1487414442162902110',
        displaySign: true,
        isIncoming: true,
        token: {
          address: '0xa0b8084BFa960F50E309c242e19417375b4c427c',
          decimals: 18,
          symbol: 'TK1'
        }
      },
      date: 1543930644000,
      exchangeRate: { amount: '7500000000000000' },
      exchanged: 198.32192562172028,
      status: 'Complete',
      transactionAddress: '0x9c242ffc1c92186af8af965315884543a3882d2d7800e20ebd8b96b9760f0ad5'
    },
    {
      accountAddress: '0xb4124cEB3451635DAcedd11767f004d8a28c6eE7',
      amount: {
        amount: '1817950984865769246',
        displaySign: true,
        isIncoming: true,
        token: {
          address: '0xb5c994DBaC8c086f574867D6791eb6F356141BA5',
          decimals: 18,
          symbol: 'TK2'
        }
      },
      date: 1543930644000,
      exchangeRate: { amount: '7500000000000000' },
      exchanged: 242.39346464876922,
      status: 'Complete',
      transactionAddress: '0x9c242ffc1c92186af8af965315884543a3882d2d7800e20ebd8b96b9760f0ad5'
    }
  ],
  vaultAddress: '0xa30E29efEeA823f3f10Ac9aFE922C2aa294B63e1'
}

const vaultMock = {
  balance (token) {
    let amount = 0

    switch (token) {
      case '0xa0b8084BFa960F50E309c242e19417375b4c427c':
        amount = '16959329631546649505'
        break
      case '0xb5c994DBaC8c086f574867D6791eb6F356141BA5':
        amount = '16628793088843782369'
        break
      case '0x6d8c9dE9b200cd050Cb0072CD24325c01DFddb4f':
        amount = '18446744073709551615'
        break
    }

    return of(amount)
  }
}

const feedMock = {
  get () {
    return of({ xrt: 7500000000000000 })
  }
}

const mockApp = {
  state () {
    return of(mockState)
  },

  external (address, abi) {
    let externalApp = {}

    switch (address) {
      case '0xa30E29efEeA823f3f10Ac9aFE922C2aa294B63e1': // vault
        externalApp = vaultMock
        break
      case '0x79a8F61b0043f73DFD07A76c1f565332c9c4AfdC': // feed
        externalApp = feedMock
        break
    }

    return externalApp
  }
}

async function renderSummary (props) {
  const summary = render(
    <AragonContext.Provider value={mockApp}>
      <YearlySalarySummary {...props} />
    </AragonContext.Provider>
  )

  const titles = {
    summary: summary.getByTestId('salary-summary-title'),
    year: summary.getByTestId('salary-paid-year-title'),
    remaining: summary.getByTestId('salary-remaining-title'),
    bill: summary.getByTestId('salary-bill-title'),
    reserves: summary.getByTestId('salary-reserves-title'),
  }

  await waitForElement(() => summary.getByTestId('salary-reserves-amount'))

  const amounts = {
    year: summary.getByTestId('salary-paid-year-amount'),
    remaining: summary.getByTestId('salary-remaining-amount'),
    bill: summary.getByTestId('salary-bill-amount'),
    reserves: summary.getByTestId('salary-reserves-amount'),
  }

  return { summary, titles, amounts }
}
