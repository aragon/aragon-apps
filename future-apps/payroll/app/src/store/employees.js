import app from './app'
import { employee, tokenAllocation } from './marshalling'
import { getIdentity } from '../services/idm'

export function getEmployeeById (id) {
  return app.call('getEmployee', id)
    .first()
    .map(data => {
      return employee({ id, ...data })
    })
    .flatMap(async employee => {
      const [{ name, role }] = await getIdentity(employee.domain)

      return { ...employee, name, role }
    })
    .toPromise()
}

export function getTokenAllocation (account, tokens) {
  const salaryAllocation = tokens.map(token =>
    app.call('getAllocation', token.address, { from: account })
      .first()
      .map(allocation => tokenAllocation({ ...token, allocation }))
      .toPromise()
  )

  return Promise.all(salaryAllocation)
}
