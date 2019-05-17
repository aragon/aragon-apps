import BN from 'bn.js'
import { startOfYear } from 'date-fns'
import { NO_END } from './utils/time'

function checkReady({
  allowedTokens,
  denominationToken,
  employees,
  totalPaymentsOverTime,
} = {}) {
  return (
    Array.isArray(allowedTokens) &&
    denominationToken &&
    Array.isArray(employees) &&
    totalPaymentsOverTime
  )
}

function appStateReducer(state) {
  const {
    allowedTokens,
    denominationToken,
    employees,
    totalPaymentsOverTime,
  } = state

  if (!checkReady(state)) {
    return {
      ...state,
      allowedTokens: allowedTokens || [],
      employees: employees || [],
      totalPaymentsOverTime: {
        monthly: [],
        quarterly: [],
        yearly: [],
      },
      ready: false,
    }
  }

  const yearStart = startOfYear(new Date())

  return {
    ...state,
    ready: true,

    allowedTokens: allowedTokens.map(token => ({
      ...token,
      decimals: new BN(token.decimals),
    })),

    denominationToken: {
      ...denominationToken,
      decimals: new BN(denominationToken.decimals),
    },

    employees: employees.map(({ data, payments = [], ...employee }) => {
      const {
        accruedSalary,
        bonus,
        reimbursements,
        denominationSalary,
        endDate,
        lastAllocationUpdate,
        lastPayroll,
      } = data
      const marshalledData = {
        ...data,
        accruedSalary: new BN(accruedSalary),
        bonus: new BN(bonus),
        reimbursements: new BN(reimbursements),
        denominationSalary: new BN(denominationSalary),
        endDate: NO_END.eq(new BN(endDate)) ? null : new Date(endDate),
        lastAllocationUpdate: new Date(lastAllocationUpdate),
        lastPayroll: new Date(lastPayroll),
      }

      const marshalledPayments = payments.map(
        ({ amount, date, denominationAmount, exchangeRate, ...payment }) => ({
          ...payment,
          amount: new BN(amount),
          date: new Date(date),
          denominationAmount: new BN(denominationAmount),
          exchangeRate: new BN(exchangeRate),
        })
      )
      const paidAmountForYear = payments
        .filter(({ date }) => date > yearStart)
        .reduce(
          (sum, { denominationAmount }) => sum.add(denominationAmount),
          new BN(0)
        )

      return {
        ...employee,
        data: marshalledData,
        payments: marshalledPayments,
        paidAmountForYear,
      }
    }),

    totalPaymentsOverTime: Object.entries(totalPaymentsOverTime).reduce(
      (total, [type, payments]) => {
        const marshalledPayments = payments.map(
          ({ amount, interval: { start, end } }) => ({
            amount: new BN(amount),
            interval: {
              start: new Date(start),
              end: new Date(end),
            },
          })
        )

        total[type] = marshalledPayments
        return total
      },
      {}
    ),
  }
}

export default appStateReducer
