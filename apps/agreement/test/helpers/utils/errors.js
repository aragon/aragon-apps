const ARAGON_OS_ERRORS = {
  ERROR_AUTH_FAILED: 'APP_AUTH_FAILED',
  ERROR_ALREADY_INITIALIZED: 'INIT_ALREADY_INITIALIZED'
}

const STAKING_ERRORS = {
  ERROR_SENDER_NOT_ALLOWED: 'STAKING_SENDER_NOT_ALLOWED',
  ERROR_TOKEN_DEPOSIT_FAILED: 'STAKING_TOKEN_DEPOSIT_FAILED',
  ERROR_TOKEN_TRANSFER_FAILED: 'STAKING_TOKEN_TRANSFER_FAILED',
  ERROR_INVALID_STAKE_AMOUNT: 'STAKING_INVALID_STAKE_AMOUNT',
  ERROR_INVALID_UNSTAKE_AMOUNT: 'STAKING_INVALID_UNSTAKE_AMOUNT',
  ERROR_NOT_ENOUGH_AVAILABLE_STAKE: 'STAKING_NOT_ENOUGH_AVAILABLE_BAL',
}

const AGREEMENT_ERRORS = {
  ERROR_SIGNER_ALREADY_SIGNED: 'AGR_SIGNER_ALREADY_SIGNED',
  ERROR_SIGNER_MUST_SIGN: 'AGR_SIGNER_MUST_SIGN',
  ERROR_ACTION_DOES_NOT_EXIST: 'AGR_ACTION_DOES_NOT_EXIST',
  ERROR_DISPUTE_DOES_NOT_EXIST: 'AGR_DISPUTE_DOES_NOT_EXIST',
  ERROR_CANNOT_CLOSE_ACTION: 'AGR_CANNOT_CLOSE_ACTION',
  ERROR_CANNOT_CHALLENGE_ACTION: 'AGR_CANNOT_CHALLENGE_ACTION',
  ERROR_CANNOT_SETTLE_ACTION: 'AGR_CANNOT_SETTLE_ACTION',
  ERROR_CANNOT_DISPUTE_ACTION: 'AGR_CANNOT_DISPUTE_ACTION',
  ERROR_CANNOT_RULE_ACTION: 'AGR_CANNOT_RULE_ACTION',
  ERROR_CANNOT_SUBMIT_EVIDENCE: 'AGR_CANNOT_SUBMIT_EVIDENCE',
  ERROR_SUBMITTER_FINISHED_EVIDENCE: 'AGR_SUBMITTER_FINISHED_EVIDENCE',
  ERROR_CHALLENGER_FINISHED_EVIDENCE: 'AGR_CHALLENGER_FINISHED_EVIDENCE',
  ERROR_STAKING_FACTORY_NOT_CONTRACT: 'AGR_STAKING_FACTORY_NOT_CONTRACT',
  ERROR_ARBITRATOR_NOT_CONTRACT: 'AGR_ARBITRATOR_NOT_CONTRACT',
  ERROR_ARBITRATOR_FEE_APPROVAL_FAILED: 'AGR_ARBITRATOR_FEE_APPROVAL_FAIL',
}

const DELAY_ERRORS = {
  ERROR_CANNOT_FORWARD: 'DELAY_CANNOT_FORWARD',
  ERROR_SENDER_NOT_ALLOWED: 'DELAY_SENDER_NOT_ALLOWED',
  ERROR_DELAYABLE_DOES_NOT_EXIST: 'DELAY_DELAYABLE_DOES_NOT_EXIST',
  ERROR_CANNOT_STOP_DELAYABLE: 'DELAY_CANNOT_STOP_DELAYABLE',
  ERROR_CANNOT_PAUSE_DELAYABLE: 'DELAY_CANNOT_PAUSE_DELAYABLE',
  ERROR_CANNOT_EXECUTE_DELAYABLE: 'DELAY_CANNOT_EXECUTE_DELAYABLE'
}

const DISPUTABLE_ERRORS = {
  ERROR_CANNOT_FORWARD: 'DISPUTABLE_CANNOT_FORWARD',
  ERROR_CANNOT_CHALLENGE: 'DISPUTABLE_CANNOT_CHALLENGE',
  ERROR_AGREEMENT_ALREADY_SET: 'DISPUTABLE_AGREEMENT_ALREADY_SET'
}

module.exports = {
  ARAGON_OS_ERRORS,
  AGREEMENT_ERRORS,
  STAKING_ERRORS,
  DELAY_ERRORS,
  DISPUTABLE_ERRORS,
}
