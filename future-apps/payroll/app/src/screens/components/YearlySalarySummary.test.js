/* eslint-env jest */

import React from 'react'
import {
  cleanup,
  // fireEvent,
  render,
  waitForElement,
} from 'react-testing-library'
import { bindElementToQueries } from 'dom-testing-library'
import 'jest-dom/extend-expect'

import YearlySalarySummary from './YearlySalarySummary'
import AragonContext from '/context/AragonContext'

import mockApp, { state } from 'mocks'

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

  it('should show loading status when there is no data', async () => {
    const emptyState = true
    const { loadings } = await renderSummary(emptyState)

    // ; ASI workarround
    ;['year', 'remaining', 'bill'].forEach(row => {
      expect(loadings[row]).not.toBeNull()
      expect(loadings[row]).toBeVisible()
    })
  })

  it('should have the right amounts', async () => {
    const { amounts } = await renderSummary()

    // ; ASI workarround
    ;[
      { name: 'year', amount: '440.72 USD' },
      { name: 'remaining', amount: '399,559.28 USD' },
      { name: 'bill', amount: '400,000 USD' },
      { name: 'reserves', amount: '+6,937.98 USD' },
    ].forEach(row => {
      expect(amounts[row.name]).not.toBeNull()
      expect(amounts[row.name]).toBeVisible()
      expect(amounts[row.name]).toHaveTextContent(row.amount)
    })
  })
})

async function renderSummary(emptyState = false) {
  let app = mockApp()

  if (emptyState) {
    const emptyState = {
      ...state,
      employees: null,
      payments: null,
    }
    app = mockApp(emptyState) // empty state
  }

  const summary = render(
    <AragonContext.Provider value={app}>
      <YearlySalarySummary />
    </AragonContext.Provider>
  )

  const year = summary.getByTestId('salary-paid-year')
  const remaining = summary.getByTestId('salary-remaining')
  const bill = summary.getByTestId('salary-bill')
  const reserves = summary.getByTestId('salary-reserves')

  const titles = {
    summary: summary.getByTestId('salary-summary-title'),
    year: year.querySelector('span:first-of-type'),
    remaining: remaining.querySelector('span:first-of-type'),
    bill: bill.querySelector('span:first-of-type'),
    reserves: reserves.querySelector('span:first-of-type'),
  }

  let amounts
  let loadings
  if (!emptyState) {
    await waitForElement(() => summary.getByTestId('final-reserves'))
    amounts = {
      year: year.querySelector('span:last-of-type'),
      remaining: remaining.querySelector('span:last-of-type'),
      bill: bill.querySelector('span:last-of-type'),
      reserves: reserves.querySelector('span:last-of-type'),
    }
  } else {
    loadings = {
      year: summary.getByTestId('loading-year'),
      remaining: summary.getByTestId('loading-remaining'),
      bill: summary.getByTestId('loading-bill'),
    }
  }

  return { summary, titles, amounts, loadings }
}
