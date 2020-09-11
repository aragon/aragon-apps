const AGREEMENT_EVENTS = {
  SIGNED: 'Signed',
  SETTING_CHANGED: 'SettingChanged',
  ACTION_SUBMITTED: 'ActionSubmitted',
  ACTION_CHALLENGED: 'ActionChallenged',
  ACTION_SETTLED: 'ActionSettled',
  ACTION_DISPUTED: 'ActionDisputed',
  ACTION_ACCEPTED: 'ActionAccepted',
  ACTION_VOIDED: 'ActionVoided',
  ACTION_REJECTED: 'ActionRejected',
  ACTION_CLOSED: 'ActionClosed',
  DISPUTABLE_ACTIVATED: 'DisputableAppActivated',
  DISPUTABLE_DEACTIVATED: 'DisputableAppDeactivated',
  COLLATERAL_REQUIREMENT_CHANGED: 'CollateralRequirementChanged'
}

const STAKING_EVENTS = {
  BALANCE_STAKED: 'Staked',
  BALANCE_UNSTAKED: 'Unstaked',
  BALANCE_LOCKED: 'Locked',
  BALANCE_UNLOCKED: 'Unlocked',
  BALANCE_SLASHED: 'Slashed',
}

const DISPUTABLE_EVENTS = {
  AGREEMENT_SET: 'AgreementSet',
  SUBMITTED: 'DisputableSubmitted',
  CHALLENGED: 'DisputableChallenged',
  ALLOWED: 'DisputableAllowed',
  REJECTED: 'DisputableRejected',
  VOIDED: 'DisputableVoided',
  CLOSED: 'DisputableClosed',
}

const APP_FEES_CASHIER_EVENTS = {
  APP_FEE_PAID: 'AppFeePaid'
}

module.exports = {
  STAKING_EVENTS,
  AGREEMENT_EVENTS,
  DISPUTABLE_EVENTS,
  APP_FEES_CASHIER_EVENTS
}
