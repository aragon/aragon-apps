import app from './app'
import { employee, tokenAllocation } from './marshalling'
import { getIdentity } from '../services/idm'

export function getEmployeeById (id, event) {
  return app.call('getEmployee', id)
    .first()
    .map(data => {
      return employee({ id, ...event, ...data })
    })
    .flatMap(async employee => {
      const [{ name, role }] = await getIdentity(employee.domain)

      return { ...employee, name, role }
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
