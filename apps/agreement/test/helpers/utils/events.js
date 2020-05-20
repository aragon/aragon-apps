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
  DISPUTABLE_REGISTERED: 'DisputableAppRegistered',
  DISPUTABLE_UNREGISTERING: 'DisputableAppUnregistering',
  DISPUTABLE_UNREGISTERED: 'DisputableAppUnregistered',
  COLLATERAL_REQUIREMENT_CHANGED: 'CollateralRequirementChanged'
}

const STAKING_EVENTS = {
  BALANCE_STAKED: 'Staked',
  BALANCE_UNSTAKED: 'Unstaked',
  BALANCE_LOCKED: 'Locked',
  BALANCE_UNLOCKED: 'Unlocked',
  BALANCE_SLAHED: 'Slashed',
}

const DISPUTABLE_EVENTS = {
  SUBMITTED: 'DisputableSubmitted',
  CHALLENGED: 'DisputableChallenged',
  ALLOWED: 'DisputableAllowed',
  REJECTED: 'DisputableRejected',
  VOIDED: 'DisputableVoided',
  AGREEMENT_SET: 'AgreementSet'
}

module.exports = {
  STAKING_EVENTS,
  AGREEMENT_EVENTS,
  DISPUTABLE_EVENTS
}
