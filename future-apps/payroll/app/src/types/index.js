import PropTypes from 'prop-types'

export const employeeType = PropTypes.shape({
  id: PropTypes.string,
  name: PropTypes.string,
  startDate: PropTypes.number,
  endDate: PropTypes.number,
  role: PropTypes.string,
  salary: PropTypes.number,
  accruedValue: PropTypes.number
})

export const salaryType = PropTypes.shape({
  date: PropTypes.number,
  status: PropTypes.string,
  transactionAddress: PropTypes.string,
  amount: PropTypes.object,
  exchangeRate: PropTypes.number
})
