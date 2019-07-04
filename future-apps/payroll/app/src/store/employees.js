import app from './app'
import { employee, tokenAllocation } from './marshalling'

export function getEmployeeById(id) {
  return app
    .call('getEmployee', id)
    .first()
    .map(data => employee({ id, ...data, role: 'Employee' }))
    .toPromise()
}

export function getEmployeeIdByAddress(accountAddress) {
  return app
    .call('getEmployeeIdByAddress', accountAddress)
    .first()
    .map(data => employee({ accountAddress, ...data, role: 'Employee' }))
    .toPromise()
}

export async function getSalaryAllocation(employeeId, tokens) {
  const salaryAllocation = await Promise.all(
    tokens.map(token =>
      app
        .call('getAllocation', employeeId, token.address)
        .first()
        .map(([allocation, minRate]) => tokenAllocation({ ...token, allocation, minRate }))
        .toPromise()
    )
  )

  return salaryAllocation.filter(({ allocation }) => allocation)
}
