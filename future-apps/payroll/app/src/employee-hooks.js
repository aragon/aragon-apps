import BN from 'bn.js'
import { differenceInSeconds } from 'date-fns'
import { useNow } from './utils/hooks'
import { ONE } from './utils/pricefeed'

export function useEmployeeCurrentOwedSalary(employee) {
  const now = useNow()

  if (!employee) {
    return new BN(0)
  }
  const { accruedSalary, denominationSalary, lastPayroll } = employee.data

  const accruedTime = differenceInSeconds(now, lastPayroll)

  const currentOwedSalary = new BN(denominationSalary).mul(new BN(accruedTime))
  return accruedSalary.add(currentOwedSalary)
}

export function useEmployeeSalary(employee, salaryAllocations, exchangeRates) {
  const owedSalary = useEmployeeCurrentOwedSalary(employee)

  const allocations =
    Array.isArray(salaryAllocations) && Array.isArray(exchangeRates)
      ? salaryAllocations.map(({ allocation, token }) => {
          const salaryAllocated = owedSalary.mul(allocation).div(100) // apply allocation %

          // Exchange to token amount based on current known rate
          const { xrt } =
            exchangeRates.find(({ quote }) => quote === token.address) || {}
          const expectedSalaryInTokens = xrt
            ? salaryAllocated.mul(xrt).div(ONE) // xrt has the denomination token as base
            : null

          return {
            allocation,
            expectedSalaryInTokens,
            salaryAllocated,
            token,
          }
        })
      : null

  return {
    allocations,
    owedSalary,
  }
}
