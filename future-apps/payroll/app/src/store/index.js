import { first, map } from 'rxjs/operators'
import { of } from 'rxjs'
import app from './app'
import Event from './events'
import { getAccountAddress } from './account'
import {
  getEmployeeById,
  getEmployeeByAddress,
  getSalaryAllocation,
} from './employees'
import { getDenominationToken, getToken } from './tokens'
import { date, payment } from './marshalling'

export default function configureStore(vaultAddress) {
  return app.store(
    async (state, { event, ...data }) => {
      const eventType = Event[event] || event
      const eventProcessor = eventMapping[eventType] || (state => state)

      try {
        const newState = await eventProcessor({ ...state }, data)

        return newState
      } catch (err) {
        console.error(`Error occurred processing '${event}' event`, err)
      }

      return state
    },
    [
      of({ event: Event.Init, vaultAddress }),

      // Handle account change
      app.accounts().pipe(
        map(([accountAddress]) => {
          return {
            event: Event.AccountChange,
            accountAddress,
          }
        })
      ),
    ]
  )
}

const eventMapping = {
  [Event.Init]: onInit,
  [Event.AccountChange]: onChangeAccount,
  [Event.AddAllowedToken]: onAddAllowedToken,
  [Event.AddEmployee]: onAddNewEmployee,
  [Event.ChangeAddressByEmployee]: onChangeEmployeeAddress,
  [Event.DetermineAllocation]: onChangeSalaryAllocation,
  [Event.SetPriceFeed]: onSetPriceFeed,
  [Event.SendPayroll]: onSendPayroll,
  [Event.SetEmployeeSalary]: onSetEmployeeSalary,
  [Event.AddEmployeeAccruedValue]: onAddEmployeeAccruedValue,
  [Event.TerminateEmployee]: onTerminateEmployee,
}

async function onInit(state, { vaultAddress }) {
  const [accountAddress, denominationToken, network] = await Promise.all([
    getAccountAddress(),
    getDenominationToken(),
    app
      .network()
      .pipe(first())
      .toPromise(),
  ])

  return { ...state, vaultAddress, accountAddress, denominationToken, network }
}

async function onChangeAccount(state, event) {
  const { accountAddress } = event
  const { tokens = [], employees = [] } = state
  let salaryAllocation = []

  const employee = employees.find(
    employee => employee.accountAddress === accountAddress
  )

  if (employee) {
    salaryAllocation = await getSalaryAllocation(employee.id, tokens)
  }

  return { ...state, accountAddress, salaryAllocation }
}

async function onAddAllowedToken(state, event) {
  const {
    returnValues: { token: tokenAddress },
  } = event
  const { tokens = [] } = state

  if (!tokens.find(t => t.address === tokenAddress)) {
    const token = await getToken(tokenAddress)

    if (token) {
      tokens.push(token)
    }
  }

  return { ...state, tokens }
}

async function onAddNewEmployee(state, event) {
  const {
    returnValues: { employeeId, name, role, startDate },
  } = event
  const { employees = [] } = state

  if (!employees.find(e => e.id === employeeId)) {
    const newEmployee = await getEmployeeById(employeeId)

    if (newEmployee) {
      employees.push({
        ...newEmployee,
        name: name,
        role: role,
        startDate: date(startDate),
      })
    }
  }

  return { ...state, employees }
}

async function onChangeEmployeeAddress(state, event) {
  const {
    returnValues: { newAddress: accountAddress },
  } = event
  const { tokens = [], employees = [] } = state
  let salaryAllocation = []

  const employee = employees.find(
    employee => employee.accountAddress === accountAddress
  )

  if (employee) {
    salaryAllocation = await getSalaryAllocation(employee.id, tokens)
  }

  return { ...state, accountAddress, salaryAllocation }
}

async function onChangeSalaryAllocation(state, event) {
  const {
    returnValues: { employee: accountAddress },
  } = event
  const { tokens = [], employees = [] } = state
  let salaryAllocation = []

  const employee = employees.find(
    employee => employee.accountAddress === accountAddress
  )

  if (employee) {
    salaryAllocation = await getSalaryAllocation(employee.id, tokens)
  }

  return { ...state, salaryAllocation }
}

function onSetPriceFeed(state, event) {
  const {
    returnValues: { feed: priceFeedAddress },
  } = event

  return { ...state, priceFeedAddress }
}

async function onSendPayroll(state, event) {
  const employees = await updateEmployeeByAddress(state, event)
  const { tokens } = state
  const {
    returnValues: { token },
    transactionHash,
  } = event
  const payments = state.payments || []

  const paymentExists = payments.some(payment => {
    const { transactionAddress, amount } = payment
    const transactionExists = transactionAddress === transactionHash
    const withSameToken = amount.token.address === token
    return transactionExists && withSameToken
  })

  if (!paymentExists) {
    const transactionToken = tokens.find(_token => _token.address === token)
    const currentPayment = payment({ ...event, token: transactionToken })
    payments.push(currentPayment)
  }

  return { ...state, employees, payments }
}

async function onSetEmployeeSalary(state, event) {
  const employees = await updateEmployeeById(state, event)
  return { ...state, employees }
}
async function onAddEmployeeAccruedValue(state, event) {
  const employees = await updateEmployeeById(state, event)
  return { ...state, employees }
}
async function onTerminateEmployee(state, event) {
  const employees = await updateEmployeeById(state, event)
  return { ...state, employees }
}

async function updateEmployeeByAddress(state, event) {
  const {
    returnValues: { employee: employeeAddress },
  } = event
  const { employees: prevEmployees } = state
  const employeeData = await getEmployeeByAddress(employeeAddress)

  const byAddress = employee => employee.accountAddress === employeeAddress
  return updateEmployeeBy(prevEmployees, employeeData, byAddress)
}

async function updateEmployeeById(state, event) {
  const {
    returnValues: { employeeId },
  } = event
  const { employees: prevEmployees } = state
  const employeeData = await getEmployeeById(employeeId)

  const byId = employee => employee.id === employeeId
  return updateEmployeeBy(prevEmployees, employeeData, byId)
}

function updateEmployeeBy(employees, employeeData, by) {
  let nextEmployees = [...employees]

  if (!nextEmployees.find(by)) {
    nextEmployees.push(employeeData)
  } else {
    nextEmployees = nextEmployees.map(employee => {
      let nextEmployee = {
        ...employee,
      }

      if (by(employee)) {
        nextEmployee = {
          ...employeeData,
          name: employee.name,
          role: employee.role,
          startDate: employee.startDate,
        }
      }
      return nextEmployee
    })
  }

  return nextEmployees
}
