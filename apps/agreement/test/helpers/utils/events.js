const AGREEMENT_EVENTS = {
  SIGNED: 'Signed',
  CONTENT_CHANGED: 'ContentChanged',
  ACTION_SUBMITTED: 'ActionSubmitted',
  ACTION_CHALLENGED: 'ActionChallenged',
  ACTION_SETTLED: 'ActionSettled',
  ACTION_DISPUTED: 'ActionDisputed',
  ACTION_ACCEPTED: 'ActionAccepted',
  ACTION_VOIDED: 'ActionVoided',
  ACTION_REJECTED: 'ActionRejected',
  ACTION_CLOSED: 'ActionClosed',
}

const STAKING_EVENTS = {
  BALANCE_STAKED: 'BalanceStaked',
  BALANCE_UNSTAKED: 'BalanceUnstaked',
  BALANCE_LOCKED: 'BalanceLocked',
  BALANCE_UNLOCKED: 'BalanceUnlocked',
  BALANCE_SLAHED: 'BalanceSlashed',
}

const DELAY_EVENTS = {
  SCHEDULED: 'Scheduled',
  PAUSED: 'Paused',
  FAST_FORWARDED: 'FastForwarded',
  STOPPED: 'Stopped',
  EXECUTED: 'Executed',
  COLLATERAL_CHANGED: 'CollateralRequirementChanged',
  PERMISSION_CHANGED: 'TokenBalancePermissionChanged',
}

module.exports = {
  AGREEMENT_EVENTS,
  STAKING_EVENTS,
  DELAY_EVENTS
}
