import { of } from '../rxjs'

import app from './app'
import Event from './events'
import { getAccountAddress } from './account'
import { getEmployeeById, getSalaryAllocation } from './employees'
import { getDenominationToken, getToken } from './tokens'

export default function configureStore () {
  return app.store(async (state, { event, ...data }) => {
    const eventType = Event[event] || event
    const eventProcessor = eventMapping[eventType] || (state => state)

    try {
      const newState = await eventProcessor({ ...state }, data)

      console.log('State', newState)
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
    })
  ])
}

const eventMapping = ({
  [Event.Init]: onInit,
  [Event.AccountChange]: onChangeAccount,
  [Event.AddAllowedToken]: onAddAllowedToken,
  [Event.AddEmployee]: onAddNewEmployee,
  [Event.ChangeAddressByEmployee]: onChangeEmployeeAddress,
  [Event.DetermineAllocation]: onChangeSalaryAllocation
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
  const { returnValues: { employeeId } } = event
  const { employees = [] } = state

  if (!employees.find(e => e.id === employeeId)) {
    const newEmployee = await getEmployeeById(employeeId)

    if (newEmployee) {
      employees.push(newEmployee)
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
