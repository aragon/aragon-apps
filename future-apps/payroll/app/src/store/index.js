import { of } from '../rxjs'

import { EventType, instance as app } from './app'
import { getCurrentAccount } from './accounts'
import { getEmployeeById, getTokenAllocation } from './employees'
import { loadTokenInfo } from './tokens'

function configureStore () {
  return app.store(async (state, { event: eventName, ...event }) => {
    const eventProcessor = eventMapping[eventName] || (state => state)
    const nextState = state === null ? await getInitialState() : { ...state }

    return eventProcessor(nextState, event)
  }, [
    // Always initialize the store with our own home-made event
    of({ event: EventType.INITIALIZATION_TRIGGER }),

    // User account events
    app.accounts().map(([account]) => {
      return {
        event: EventType.ACCOUNT_CHANGED,
        account
      }
    })
  ])
}

const eventMapping = ({
  [EventType.ACCOUNT_CHANGED]: onAccountChange,
  [EventType.ADD_ALLOWED_TOKEN]: onAddAllowedToken,
  [EventType.ADD_EMPLOYEE]: onAddNewEmployee,
  [EventType.CHANGE_EMPLOYEE_ADDRESS]: onChangeEmployeeAddress,
  [EventType.DETERMINE_ALLOCATION]: onDetermineAllocation
})

async function getInitialState () {
  const address = await getCurrentAccount()

  return {
    currentAccount: {
      address
    }
  }
}

function onAccountChange (state, event) {
  return state // TODO
}

async function onAddAllowedToken (state, event) {
  const { allowedTokens = [] } = state
  const { returnValues: { token: tokenAddress } } = event

  if (!allowedTokens.find(t => t.address === tokenAddress)) {
    const token = await loadTokenInfo(tokenAddress)

    if (token) {
      allowedTokens.push(token)
    }
  }

  return { ...state, allowedTokens }
}

async function onAddNewEmployee (state, event) {
  const { employees = [] } = state
  const { returnValues: { employeeId } } = event

  if (!employees.find(e => e.id === employeeId)) {
    const newEmployee = await getEmployeeById(employeeId)

    if (newEmployee) {
      employees.push(newEmployee)
    }
  }

  return { ...state, employees }
}

async function onChangeEmployeeAddress (state, event) {
  const { allowedTokens, currentAccount } = state
  const { returnValues: { newAddress: employeeAddress } } = event

  if (employeeAddress === currentAccount.address) {
    currentAccount.salaryAllocation = await getTokenAllocation(
      currentAccount.address,
      allowedTokens
    )
  }

  return { ...state, currentAccount }
}

async function onDetermineAllocation (state, event) {
  const { allowedTokens, currentAccount } = state
  const { returnValues: { employee: employeeAddress } } = event

  if (employeeAddress === currentAccount.address) {
    currentAccount.salaryAllocation = await getTokenAllocation(
      currentAccount.address,
      allowedTokens
    )
  }

  return { ...state, currentAccount }
}

export default configureStore
