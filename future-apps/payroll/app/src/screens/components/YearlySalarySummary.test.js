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

import YearlySalarySummary from './YearlySalarySummary'
import AragonContext from '../../context/AragonContext'

import mockApp from '../../../mocks'

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
