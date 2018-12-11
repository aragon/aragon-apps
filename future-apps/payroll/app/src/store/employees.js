import app from './app'
import { employee, tokenAllocation } from './marshalling'

export function getEmployeeById (id) {
  return app.call('getEmployee', id)
    .first()
    .map(data => {
      // Role is a static value until further discussion - sgobotta
      // TODO - https://github.com/protofire/aragon-apps/issues/100
      return employee({ id, ...data, role: 'Employee' })
    })
    .toPromise()
}

export function getEmployeeByAddress (accountAddress) {
  return app.call('getEmployeeByAddress', accountAddress)
    .first()
    .map(data => {
      // Role is a static value until further discussion - sgobotta
      // TODO - https://github.com/protofire/aragon-apps/issues/100
      return employee({ accountAddress, ...data, role: 'Employee' })
    })
    .toPromise()
}

export async function getSalaryAllocation (accountAddress, tokens) {
  const salaryAllocation = await Promise.all(
    tokens.map(token =>
      app.call('getAllocation', token.address, { from: accountAddress })
        .first()
        .map(allocation => tokenAllocation({ ...token, allocation }))
        .toPromise()
    )
  )

  return salaryAllocation.filter(({ allocation }) => allocation)
}
