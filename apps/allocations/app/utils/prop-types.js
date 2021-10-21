import PropTypes from 'prop-types'

export const budget = PropTypes.shape({
  active: PropTypes.bool.isRequired,
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  amount: PropTypes.string.isRequired,
  token: PropTypes.shape({
    symbol: PropTypes.string.isRequired,
  }).isRequired,
})
