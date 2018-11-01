import Aragon from '@aragon/client'
import tokenDecimalsAbi from './abi/token-decimals.json'
import tokenSymbolAbi from './abi/token-symbol.json'

const tokenAbi = [].concat(tokenDecimalsAbi, tokenSymbolAbi)

const allowedTokens = new Map()
let allowedTokensAddresses = []

import * as idm from './services/idm'

const app = new Aragon()

app.store(
  async (state, { event, ...eventData }) => {
    let nextState = {
      ...state
    }

    try {
      if (state === null) {
        const [account] = await app
          .accounts()
          .first()
          .map(result => result)
          .toPromise()

        const initialState = {
          account,
          employees: await getAllEmployees()
        }

        nextState = initialState
      }

      switch (event) {
        case 'AddEmployee':
          const employees = await getAllEmployees()

          nextState = {
            ...nextState,
            employees
          }
          break
        case 'AddAllowedToken':
          nextState = await addAllowedToken(nextState, eventData)
          break
        case 'ChangeAddressByEmployee':
          nextState = await loadSalaryAllocation(
            nextState,
            eventData.returnValues.employeeAddress
          )
          break
        case 'DetermineAllocation':
          nextState = await loadSalaryAllocation(
            nextState,
            eventData.returnValues.employee
          )
          break
        case 'ACCOUNT_CHANGED':
          const { account } = eventData
          nextState = {
            ...nextState,
            account
          }

          nextState = await loadSalaryAllocation(nextState, account)
          break
        default:
          break
      }
    } catch (e) {
      console.error(e)
    }

    return nextState
  },
  [
    app.accounts().map(result => {
      const [account] = result
      return { event: 'ACCOUNT_CHANGED', account }
    })
  ]
)

function getEmployeeById (id) {
  return app
    .call('getEmployee', id)
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

  const lastEmployeeId = await app
    .call('nextEmployee')
    .first()
    .map(value => parseInt(value, 10))
    .toPromise()

  for (let id = 1; id < lastEmployeeId; id++) {
    employee.push(getEmployeeById(id))
  }

  return Promise.all(employee)
}

async function addAllowedToken (
  state,
  { returnValues: { token: tokenAddress } }
) {
  if (!allowedTokens.has(tokenAddress)) {
    allowedTokensAddresses = [...allowedTokensAddresses, tokenAddress]

    const tokenContract = app.external(tokenAddress, tokenAbi)
    const [decimals, symbol] = await Promise.all([
      loadTokenDecimals(tokenContract),
      loadTokenSymbol(tokenContract)
    ])

    allowedTokens.set(tokenAddress, {
      tokenContract,
      decimals,
      symbol
    })
  }

  const salaryAllocation = await getAllocation(state.account)

  return {
    ...state,
    salaryAllocation,
    allowedTokens: marshallAllowedTokens(allowedTokens)
  }
}

async function loadSalaryAllocation (state, employeeAddress) {
  let { salaryAllocation } = state

  if (employeeAddress === state.account) {
    salaryAllocation = await getAllocation(state.account)
  }

  return {
    ...state,
    salaryAllocation
  }
}

async function getAllocation (account) {
  const tokensAllocation = await Promise.all(
    allowedTokensAddresses.map(tokenAddress => {
      return app
        .call('getAllocation', tokenAddress, {from: account})
        .first()
        .map(allocation => {
          return marshallTokensAllocation(tokenAddress, allocation)
        })
        .toPromise()
    })
  )

  return tokensAllocation;
}

function loadTokenDecimals (tokenContract) {
  return tokenContract
    .decimals()
    .first()
    .map(value => parseInt(value, 10))
    .toPromise()
}

function loadTokenSymbol (tokenContract) {
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

function marshallAllowedTokens (allowedTokens) {
  let result = {}
  for (const [address, { decimals, symbol }] of allowedTokens) {
    result[address] = { decimals, symbol }
  }

  return result
}

function marshallTokensAllocation (tokenAddress, allocation) {
  const token = allowedTokens.get(tokenAddress);

  return {
    symbol: token.symbol,
    allocation: parseInt(allocation || 0, 10)
  }
}
