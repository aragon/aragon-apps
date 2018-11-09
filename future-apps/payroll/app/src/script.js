import Aragon from '@aragon/client'

import * as idm from './services/idm'

const app = new Aragon()

app.store(async (state, { event, ...data }) => {
  let nexState = {
    ...state
  }

  try {

    console.log(event, data)
    if (event === 'AddEmployee') {
      const { returnValues: { employeeId } } = data
      const { employees = [] } = nexState

      if (!employees.find(e => e.id === employeeId)) {
        const newEmployee = await getEmployeeById(employeeId, data)

        if (newEmployee) {
          employees.push(newEmployee)
        }
      }

      nexState = {
        ...nexState,
        employees
      }
    }

    console.log('nexState', nexState )
  } catch (e) {
    console.log('ERROR', e)
  }


  return nexState
})

function getEmployeeById (id, event) {
  return app.call('getEmployee', id)
    .first()
    .map(data => marshallEmployeeData({ ...data, ...event, id }))
    .flatMap(async employee => {
      const [{ name, role }] = await idm.getIdentity(employee.domain)

      return { ...employee, name, role }
    })
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
