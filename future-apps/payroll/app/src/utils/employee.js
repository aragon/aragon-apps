import { SECONDS_IN_A_YEAR } from './time'

export function getAllocationUpdateKey(employee) {
  if (!employee) {
    return `nonexistent:0`
  }
  const {
    employeeId,
    data: { lastAllocationUpdate },
  } = employee
  return `${employeeId}:${lastAllocationUpdate.getTime()}`
}

export function getYearlySalary(employee) {
  return employee.data.denominationSalary.mul(SECONDS_IN_A_YEAR)
}
