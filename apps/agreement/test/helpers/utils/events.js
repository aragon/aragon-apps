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
  BALANCE_STAKED: 'Staked',
  BALANCE_UNSTAKED: 'Unstaked',
  BALANCE_LOCKED: 'Locked',
  BALANCE_UNLOCKED: 'Unlocked',
  BALANCE_SLAHED: 'Slashed',
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
