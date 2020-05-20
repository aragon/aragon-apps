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
  ERROR_SENDER_NOT_ALLOWED: 'AGR_SENDER_NOT_ALLOWED',
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
  ERROR_ACL_SIGNER_MISSING: 'AGR_ACL_ORACLE_SIGNER_MISSING',
  ERROR_ACL_SIGNER_NOT_ADDRESS: 'AGR_ACL_ORACLE_SIGNER_NOT_ADDR',
  ERROR_SENDER_CANNOT_CHALLENGE_ACTION: 'AGR_SENDER_CANT_CHALLENGE_ACTION',
  ERROR_MISSING_COLLATERAL_REQUIREMENT: 'AGR_MISSING_COLLATERAL_REQ',
  ERROR_DISPUTABLE_APP_NOT_REGISTERED: 'AGR_DISPUTABLE_NOT_REGISTERED',
  ERROR_DISPUTABLE_APP_ALREADY_EXISTS: 'AGR_DISPUTABLE_ALREADY_EXISTS'
}

const DISPUTABLE_ERRORS = {
  ERROR_CANNOT_SUBMIT: 'DISPUTABLE_CANNOT_SUBMIT',
  ERROR_AGREEMENT_NOT_SET: 'DISPUTABLE_AGREEMENT_NOT_SET',
  ERROR_AGREEMENT_ALREADY_SET: 'DISPUTABLE_AGREEMENT_ALREADY_SET',
  ERROR_SENDER_NOT_AGREEMENT: 'DISPUTABLE_SENDER_NOT_AGREEMENT',
}

module.exports = {
  ARAGON_OS_ERRORS,
  AGREEMENT_ERRORS,
  STAKING_ERRORS,
  DISPUTABLE_ERRORS,
}
