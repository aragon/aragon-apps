import { differenceInYears } from 'date-fns'

export const MONTHS_IN_A_YEAR = 12

export function totalPaidThisYear(payments, accountAddress) {
  const filter = p => {
    const yearDiff = differenceInYears(new Date(p.date), new Date())
    return p.accountAddress === accountAddress && yearDiff === 0
  }
  const field = 'exchanged'
  const totalPaid = summation(payments.filter(filter), field)
  return totalPaid
}

export function summation(list, field) {
  const init = 0
  const reducer = (acc, item) => acc + item[field]
  const sum = list.reduce(reducer, init)
  return sum
}
