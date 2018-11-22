import { of } from '../rxjs'

import app from './app'
import Event from './events'
import { getAccountAddress } from './account'
import { getEmployeeById, getEmployeeByAddress, getSalaryAllocation } from './employees'
import { getDenominationToken, getToken } from './tokens'
import { date, payment } from './marshalling'
import financeEvents from './abi/finance-events'

export default function configureStore (financeAddress) {
  const financeApp = app.external(financeAddress, financeEvents)

  return app.store(async (state, { event, ...data }) => {
    console.log(event, data)
    const eventType = Event[event] || event
    const eventProcessor = eventMapping[eventType] || (state => state)

    try {
      const newState = await eventProcessor({ ...state }, data)

      return newState
    } catch (err) {
      console.error(`Error occurred processing '${event}' event`, err)
    }

    return state
  }, [
    of({ event: Event.Init }),

    // Handle account change
    app.accounts().map(([accountAddress]) => {
      return {
        event: Event.AccountChange,
        accountAddress
      }
    }),

    // Handle Finance eventes
    financeApp.events()
  ])
}

const eventMapping = ({
  [Event.Init]: onInit,
  [Event.AccountChange]: onChangeAccount,
  [Event.AddAllowedToken]: onAddAllowedToken,
  [Event.AddEmployee]: onAddNewEmployee,
  [Event.ChangeAddressByEmployee]: onChangeEmployeeAddress,
  [Event.DetermineAllocation]: onChangeSalaryAllocation,
  [Event.SetPriceFeed]: onSetPriceFeed,
  [Event.SendPayroll]: onSendPayroll
})

async function onInit (state) {
  const [accountAddress, denominationToken] = await Promise.all([
    getAccountAddress(),
    getDenominationToken()
  ])

  return { ...state, accountAddress, denominationToken }
}

async function onChangeAccount (state, event) {
  const { accountAddress } = event
  const { tokens = [] } = state

  const salaryAllocation = await getSalaryAllocation(
    accountAddress,
    tokens
  )

  return { ...state, accountAddress, salaryAllocation }
}

async function onAddAllowedToken (state, event) {
  const { returnValues: { token: tokenAddress } } = event
  const { tokens = [] } = state

  if (!tokens.find(t => t.address === tokenAddress)) {
    const token = await getToken(tokenAddress)

    if (token) {
      tokens.push(token)
    }
  }

  return { ...state, tokens }
}

async function onAddNewEmployee (state, event) {
  const { returnValues: { employeeId, startDate } } = event
  const { employees = [] } = state

  if (!employees.find(e => e.id === employeeId)) {
    const newEmployee = await getEmployeeById(employeeId)

    if (newEmployee) {
      employees.push({
        ...newEmployee,
        startDate: date(startDate)
      })
    }
  }

  return { ...state, employees }
}

async function onChangeEmployeeAddress (state, event) {
  const { returnValues: { newAddress: accountAddress } } = event
  const { tokens = [] } = state

  const salaryAllocation = await getSalaryAllocation(
    accountAddress,
    tokens
  )

  return { ...state, accountAddress, salaryAllocation }
}

async function onChangeSalaryAllocation (state, event) {
  const { returnValues: { employee: accountAddress } } = event
  const { tokens = [] } = state

  const salaryAllocation = await getSalaryAllocation(
    accountAddress,
    tokens
  )

  return { ...state, salaryAllocation }
}

function onSetPriceFeed (state, event) {
  const { returnValues: { feed: priceFeedAddress } } = event

  return { ...state, priceFeedAddress }
}

async function onSendPayroll (state, event) {
  const { tokens } = state
  const { returnValues: { employee: employeeAddress, token }, transactionHash } = event
  const prevEmployees = state.employees
  const payments = state.payments || []
  const newEmployeeData = await getEmployeeByAddress(employeeAddress)
  const paymentExists = payments.some(payment => {
    const { transactionAddress, amount } = payment

    const transactionExists = transactionAddress === transactionHash
    const withSameToken = amount.token === token
    return transactionExists && withSameToken
  })

  if (!paymentExists) {
    const transactionToken = tokens.find((_token) => _token.address === token)
    const currentPayment = payment({ ...event, token: transactionToken })
    payments.push(currentPayment)
  }

  const employees = prevEmployees.map(employee => {
    if (employee.accountAddress === employeeAddress) {
      return {
        ...newEmployeeData,
        startDate: employee.startDate
      }
    }

    return employee
  })

  return { ...state, employees, payments }
}
