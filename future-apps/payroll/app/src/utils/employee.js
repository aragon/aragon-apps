import { SECONDS_IN_A_YEAR } from './time'

export function getYearlySalary(employee) {
  return employee.data.denominationSalary.mul(SECONDS_IN_A_YEAR)
}
