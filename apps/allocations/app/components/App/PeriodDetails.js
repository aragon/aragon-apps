import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import { useAragonApi } from '../../api-react'
import { Box, GU } from '@aragon/ui'
import BigNumber from 'bignumber.js'
import InfoBlock from './InfoBlock'
import usePeriod from '../../hooks/usePeriod'
import { ETHER_TOKEN_FAKE_ADDRESS, isTokenVerified } from '../../../../../shared/utils/token-utils'

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MONTHS = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ]
const CONVERT_API_BASE = 'https://min-api.cryptocompare.com/data'
const CONVERT_INTERVAL = 60000

const convertApiUrl = symbols =>
  `${CONVERT_API_BASE}/price?fsym=USD&tsyms=${symbols.join(',')}`

const processTime = ms => {
  const days = Math.round(ms/MS_PER_DAY)
  if(days%7 === 0){
    const weeks = days/7
    return [ String(weeks), `week${weeks === 1 ? '' : 's'}` ]
  }
  return [ String(days), `day${days === 1 ? '' : 's'}` ]
}

const getBudgetTotals = (budgets, rates) => {
  if(!budgets.length || !rates){
    return { amount: new BigNumber(0), remaining: new BigNumber(0) }
  }

  const convertedBudgets = budgets.map(budget => {
    const rate = rates[budget.token.symbol]
    return {
      amount: rate ? (new BigNumber(budget.amount)).div(rate).div(10**budget.token.decimals) : new BigNumber(0),
      remaining: rate ? (new BigNumber(budget.remaining)).div(rate).div(10**budget.token.decimals) : new BigNumber(0)
    }
  })

  return convertedBudgets.reduce((total, budget) => {
    return {
      amount: total.amount.plus(budget.amount),
      remaining: total.remaining.plus(budget.remaining)
    }
  })
}

const PeriodDetails = () => {
  const { appState : { budgets = [] } } = useAragonApi()
  const { startDate, endDate, duration } = usePeriod()
  const [ rates, setRates ] = useState(null)
  const [ ratesFetchedAt, setRatesFetchedAt ] = useState(new Date())
  const { amount, remaining } = getBudgetTotals(budgets, rates)
  const durationArray = processTime(duration)
  const remainingArray = processTime(endDate - new Date())

  useEffect(() => {
    const interval = setInterval(() => setRatesFetchedAt(new Date()), CONVERT_INTERVAL)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    async function updateConvertedRates() {
      if(budgets.length) {
        const symbols = budgets.filter(({ token }) => isTokenVerified(token.symbol))
          .map(({ token }) => token.symbol)
        const res = await fetch(convertApiUrl(symbols))
        const convertRates = await res.json()
        if (JSON.stringify(rates) !== JSON.stringify(convertRates)) {
          setRates(convertRates)
        }
      }
    }
    updateConvertedRates()
  }, [ratesFetchedAt])

  return (
    <Box heading="Account Period Details" css={`margin-bottom: ${2 * GU}px;`}>
      <div css={`
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
      `}>
        <InfoBlock
          style={{ margin: `${2 * GU}px 0` }}
          title="Budgeted"
          large={amount.dp(0).toNumber().toLocaleString()}
          small='USD'
        />
        <InfoBlock
          style={{ margin: `${2 * GU}px 0` }}
          title="Budget utilized"
          large={amount.eq(0) && remaining.eq(0)
            ? '0'
            : amount.minus(remaining).div(amount).times(100).dp(0).toString()}
          small='%'
        />
        <InfoBlock
          style={{ margin: `${2 * GU}px 0` }}
          title="Period duration"
          large={durationArray[0]}
          small={durationArray[1]}
        />
        <InfoBlock
          style={{ margin: `${2 * GU}px 0` }}
          title="Next period"
          large={Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(endDate)}
          small={endDate.getFullYear().toString()}
        />
        <InfoBlock
          style={{ margin: `${2 * GU}px 0` }}
          title="Time remaining"
          large={remainingArray[0]}
          small={remainingArray[1]}
        />
      </div>
    </Box>
  )
}

export default PeriodDetails
