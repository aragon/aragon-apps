import app from './app'
import { employee, tokenAllocation } from './marshalling'

export async function getEmployeeById(id) {
  const employeeData = await app.call('getEmployee', id).toPromise()
  return employee({ id, ...employeeData, role: 'Employee' })
}

export async function getEmployeeByAddress(accountAddress) {
  const employeeData = await app
    .call('getEmployeeByAddress', accountAddress)
    .toPromise()
  return employee({ accountAddress, ...employeeData, role: 'Employee' })
}

export async function getSalaryAllocation(employeeId, tokens) {
  const salaryAllocation = await Promise.all(
    tokens.map(async token => {
      const allocation = app
        .call('getAllocation', employeeId, token.address)
        .toPromise()
      return tokenAllocation({ ...token, allocation })
    })
  )

  return salaryAllocation.filter(({ allocation }) => allocation)
}
