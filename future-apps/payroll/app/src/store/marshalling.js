export function currency (value) {
  return parseInt(value || 0)
}

export function date (epoch) {
  if (!epoch || BigInt(epoch) > Number.MAX_SAFE_INTEGER) { // eslint-disable-line
    return null
  }

  return parseInt(epoch) * 1000
}

export function employee (data) {
  const result = {
    id: data.id,
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
