import PropTypes from 'prop-types'

const issueShape = PropTypes.shape({
  balance: PropTypes.string,
  body: PropTypes.string,
  deadline: PropTypes.string,
  exp: PropTypes.number,
  fundingHistory: PropTypes.arrayOf(PropTypes.object),
  hours: PropTypes.string,
  id: PropTypes.string,
  labels: PropTypes.object,
  level: PropTypes.string,
  number: PropTypes.number,
  repo: PropTypes.string,
  repoId: PropTypes.string,
  requestsData: PropTypes.arrayOf(PropTypes.object),
  symbol: PropTypes.string,
  title: PropTypes.string,
  url: PropTypes.string,
  work: PropTypes.object,
  workStatus: PropTypes.oneOf([
    undefined,
    'funded',
    'review-applicants',
    'in-progress',
    'review-work',
    'fulfilled',
  ]),
  workSubmissions: PropTypes.arrayOf(PropTypes.object),
}).isRequired

const userGitHubShape = PropTypes.shape({
  avatarUrl: PropTypes.string.isRequired,
  url: PropTypes.string.isRequired,
  login: PropTypes.string.isRequired,
}).isRequired

export { issueShape, userGitHubShape }
