const NOW = 1553703809 // random fixed timestamp in seconds
const ONE_MINUTE = 60
const TWO_MINUTES = ONE_MINUTE * 2
const ONE_MONTH = 60 * 60 * 24 * 31
const TWO_MONTHS = ONE_MONTH * 2
const SECONDS_IN_A_YEAR = 31557600 // 365.25 days

const RATE_EXPIRATION_TIME = TWO_MONTHS

module.exports = {
  NOW,
  ONE_MINUTE,
  TWO_MINUTES,
  ONE_MONTH,
  TWO_MONTHS,
  RATE_EXPIRATION_TIME,
  SECONDS_IN_A_YEAR
}
