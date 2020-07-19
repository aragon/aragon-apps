const { makeErrorMappingProxy } = require('@aragon/contract-helpers-test')

module.exports = makeErrorMappingProxy({
  // aragonOS errors
  APP_AUTH_FAILED: 'APP_AUTH_FAILED',
  INIT_ALREADY_INITIALIZED: 'INIT_ALREADY_INITIALIZED',
  INIT_NOT_INITIALIZED: 'INIT_NOT_INITIALIZED',
  RECOVER_DISALLOWED: 'RECOVER_DISALLOWED',
  SAFE_ERC_20_BALANCE_REVERTED: 'SAFE_ERC_20_BALANCE_REVERTED',

  // Agent errors
  AGENT_TARGET_PROTECTED: 'AGENT_TARGET_PROTECTED',
  AGENT_PROTECTED_TOKENS_MODIFIED: 'AGENT_PROTECTED_TOKENS_MODIFIED',
  AGENT_PROTECTED_BALANCE_LOWERED: 'AGENT_PROTECTED_BALANCE_LOWERED',
  AGENT_TOKENS_CAP_REACHED: 'AGENT_TOKENS_CAP_REACHED',
  AGENT_TOKEN_ALREADY_PROTECTED: 'AGENT_TOKEN_ALREADY_PROTECTED',
  AGENT_TOKEN_NOT_ERC20: 'AGENT_TOKEN_NOT_ERC20',
  AGENT_TOKEN_NOT_PROTECTED: 'AGENT_TOKEN_NOT_PROTECTED',
  AGENT_DESIGNATED_TO_SELF: 'AGENT_DESIGNATED_TO_SELF',
  AGENT_CAN_NOT_FORWARD: 'AGENT_CAN_NOT_FORWARD',
})
