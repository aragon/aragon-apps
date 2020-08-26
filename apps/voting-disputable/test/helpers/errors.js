const ARAGON_OS_ERRORS = {
  APP_AUTH_FAILED: 'APP_AUTH_FAILED',
  INIT_ALREADY_INITIALIZED: 'INIT_ALREADY_INITIALIZED',
  INIT_NOT_INITIALIZED: 'INIT_NOT_INITIALIZED',
  RECOVER_DISALLOWED: 'RECOVER_DISALLOWED',
  EVMCALLS_INVALID_LENGTH: 'EVMCALLS_INVALID_LENGTH'
}

const VOTING_ERRORS = {
  // Validation
  VOTING_NO_VOTE: 'VOTING_NO_VOTE',
  VOTING_CHANGE_QUORUM_TOO_BIG: 'VOTING_CHANGE_QUORUM_TOO_BIG',
  VOTING_CHANGE_SUPPORT_TOO_SMALL: 'VOTING_CHANGE_SUPPORT_TOO_SMALL',
  VOTING_CHANGE_SUPPORT_TOO_BIG: 'VOTING_CHANGE_SUPPORT_TOO_BIG',
  VOTING_INVALID_OVERRULE_WINDOW: 'VOTING_INVALID_OVERRULE_WINDOW',
  VOTING_INVALID_QUIET_END_PERIOD: 'VOTING_INVALID_QUIET_END_PERIOD',
  VOTING_INVALID_EXECUTION_SCRIPT: 'VOTING_INVALID_EXECUTION_SCRIPT',

  // Workflow
  VOTING_CANNOT_FORWARD: 'VOTING_CANNOT_FORWARD',
  VOTING_NO_VOTING_POWER: 'VOTING_NO_VOTING_POWER',
  VOTING_CANNOT_VOTE: 'VOTING_CANNOT_VOTE',
  VOTING_PAST_REP_VOTING_WINDOW: 'VOTING_PAST_REP_VOTING_WINDOW',
  VOTING_CANNOT_EXECUTE: 'VOTING_CANNOT_EXECUTE',
}

module.exports = {
  ARAGON_OS_ERRORS,
  VOTING_ERRORS
}
