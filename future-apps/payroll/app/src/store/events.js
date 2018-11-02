//
// Event Types
//

export const INITIALIZATION_TRIGGER = Symbol('INITIALIZATION_TRIGGER')

// From Payroll
export const ADD_ALLOWED_TOKEN = 'AddAllowedToken'
export const ADD_EMPLOYEE = 'AddEmployee'
export const SET_EMPLOYEE_SALARY = 'SetEmployeeSalary'
export const ADD_EMPLOYEE_ACCRUED_VALUE = 'AddEmployeeAccruedValue'
export const TERMINATE_EMPLOYEE = 'TerminateEmployee'
export const CHANGE_EMPLOYEE_ADDRESS = 'ChangeAddressByEmployee'
export const DETERMINE_ALLOCATION = 'DetermineAllocation'
export const SEND_PAYROLL = 'SendPayroll'
export const SET_PRICE_FEED = 'SetPriceFeed'
export const SET_RATE_EXPIRY_TIME = 'SetRateExpiryTime'

// Other events
export const ACCOUNT_CHANGED = 'AccountChange'
