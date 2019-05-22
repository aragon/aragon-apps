import app from './app'
import { employee, tokenAllocation } from './marshalling'

export function getEmployeeById(id) {
  return app
    .call('getEmployee', id)
    .first()
    .map(data => {
      return employee({ id, ...data, role: 'Employee' })
    })
    .toPromise()
}

export function getEmployeeByAddress(accountAddress) {
  return app
    .call('getEmployeeByAddress', accountAddress)
    .first()
    .map(data => {
      return employee({ accountAddress, ...data, role: 'Employee' })
    })
    .toPromise()
}

export async function getSalaryAllocation(employeeId, tokens) {
  const salaryAllocation = await Promise.all(
    tokens.map(token =>
      app
        .call('getAllocation', employeeId, token.address)
        .first()
        .map(allocation => tokenAllocation({ ...token, allocation }))
        .toPromise()
    )
  )

  return salaryAllocation.filter(({ allocation }) => allocation)
}
