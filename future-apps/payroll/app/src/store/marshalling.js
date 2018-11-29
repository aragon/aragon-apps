export function currency (value) {
  return parseInt(value || 0)
}

export function date (epoch) {
  const epochInt = parseInt(epoch)
  if (!epoch || !Number.isSafeInteger(epochInt)) {
    return null
  }

  return epochInt * 1000
}

export function employee (data) {
  const result = {
    id: data.id || data.employeeId,
    accountAddress: data.accountAddress,
    domain: data.name,
    salary: currency(data.denominationSalary),
    accruedValue: currency(data.accruedValue),
    lastPayroll: date(data.lastPayroll),
    startDate: date(data.startDate),
    endDate: date(data.endDate),
    terminated: !!data.terminated
  }

  return result
}

export function tokenAllocation (data) {
  return {
    address: data.address,
    symbol: data.symbol,
    allocation: parseInt(data.allocation) || 0
  }
}

export function payment (data) {
  const exchanged = (data.returnValues.amount / data.returnValues.exchangeRate)
  return {
    accountAddress: data.returnValues.employee,
    amount: {
      amount: data.returnValues.amount,
      isIncoming: true, // FIXME: Assumption: all salaries are incoming - sgobotta
      displaySign: true, // FIXME: The send payroll event should provide the displaysign option
      token: {
        address: data.token.address,
        symbol: data.token.symbol,
        decimals: data.token.decimals
      }
    },
    transactionAddress: data.transactionHash,
    date: date(data.returnValues.paymentDate),
    status: 'Pending...', // FIXME: Find out how the status is calculated - - sgobotta
    exchangeRate: {
      amount: data.returnValues.exchangeRate
    },
    exchanged
  }
}
