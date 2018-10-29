import Aragon from '@aragon/client'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenSymbolAbi from './abi/token-symbol.json'

const tokenAbi = [].concat(tokenDecimalsAbi, tokenSymbolAbi)

const allowedTokens = new Map();

import * as idm from './services/idm'

const app = new Aragon()

app.store(async (state, { event, ...eventData }) => {
  if (state === null) {
    const initialState = {
      employees: await getAllEmployees()
    }

    state = initialState
  }

  let nextState = {
    ...state,
  }

  switch (event) {
    case 'AddEmployee':
      const employees = await getAllEmployees()

      nextState = {
        ...state,
        employees
      }
      break
    case 'AddAllowedToken':
      nextState = await addAllowedToken(nextState, eventData)
      break
    default:
      break
  }

  return nextState
})

function getEmployeeById (id) {
  return app.call('getEmployee', id)
    .first()
    .map(data => marshallEmployeeData({ id, ...data }))
    .flatMap(async employee => {
      const [{ name, role }] = await idm.getIdentity(employee.domain)

      return { ...employee, name, role }
    })
    .toPromise()
}

async function getAllEmployees () {
  const employee = []

  const lastEmployeeId = await app.call('nextEmployee')
    .first()
    .map(value => parseInt(value, 10))
    .toPromise()

  for (let id = 1; id < lastEmployeeId; id++) {
    employee.push(
      getEmployeeById(id)
    )
  }

  return Promise.all(employee)
}

async function addAllowedToken (state, { returnValues: { token: tokenAddress }}) {
  if (!allowedTokens.has(tokenAddress)) {
    const tokenContract = app.external(tokenAddress, tokenAbi)
    const [decimals, symbol] = await Promise.all([
      loadTokenDecimals(tokenContract),
      loadTokenSymbol(tokenContract)
    ])

    allowedTokens.set(
      tokenAddress,
      {
        tokenContract,
        decimals,
        symbol
      }
    )
  }

  return {
    ...state,
    allowedTokens: marshallAllowedTokens(allowedTokens)
  }
}

function loadTokenDecimals(tokenContract) {
  return tokenContract
    .decimals()
    .first()
    .map(value => parseInt(value, 10))
    .toPromise()
}

function loadTokenSymbol(tokenContract) {
  return tokenContract
    .symbol()
    .first()
    .toPromise()
}

function marshallCurrency (value) {
  return parseInt(value || 0, 10)
}

function marshallDate (epoch) {
  if (!epoch || BigInt(epoch) > Number.MAX_SAFE_INTEGER) {
    return null
  }

  return parseInt(epoch, 10) * 1000
}

function marshallEmployeeData (data) {
  const result = {
    id: data.id,
    accountAddress: data.accountAddress,
    domain: data.name,
    salary: marshallCurrency(data.denominationSalary),
    accruedValue: marshallCurrency(data.accruedValue),
    startDate: marshallDate(data.startDate),
    endDate: marshallDate(data.endDate),
    terminated: data.terminated
  }

  if (result.accruedValue < 1) {
    result.startDate = marshallDate(data.lastPayroll)
  } else {
    result.lastPayroll = marshallDate(data.lastPayroll)
  }

  return result
}

function marshallAllowedTokens(allowedTokens) {
  let result = {};
  for (const [address, {decimals, symbol}] of allowedTokens) {
    result[address] = {decimals, symbol}
  }

  return result;
}
