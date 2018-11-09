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
