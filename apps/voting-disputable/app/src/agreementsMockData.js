let action1 = {
  //Agreement.sol: getAction(actionID)
  disputable: '', //Address of the disputable that created the action
  disputableActionId: '24',
  collateralId: '',
  endDate: 1593613596069, //Timestamp when the disputable action ends unless it's closed beforehand
  state: 'Closed', //Submitted, Challenged, Closed
  submitter: '0xff4643B0161F92b8b568Af62be313E41F32E4baD', //Facu's address
  context: 'Link',
  currentChallengeId: '35',
  //if currentChallengeId != null
  challenge: {
    //Agreement.sol: getChallenge(challengeId)
    actionId: '',
    challenger: '0xa9aC50dCe74C46025DC9dCeAFb4FA21f0Dc142ea', //my address
    endDate: Date.now() + 30 * 1000 * 60 * 60, //is the same as action.endDate?
    context: 'link',
    settlementOffer: '12000000000000000000',
    arbitratorFeeAmount: '1800000000000000000',
    arbitratorFeeToken: 'ANT',
    state: 'Settled', //Waiting, Settled, Disputed, Rejected, Accepted, Voided
    submitterFinishedEvidence: false,
    challengerFinishedEvidence: true,
    disputeId: '24',
    ruling: '',
  },
  //if collateralId != null
  collateral: {
    //Agreement.sol: getCollateralRequirement(disputableAppAddress,collateralId)
    collateralToken: 'ANT',
    actionAmount: '100',
    challengeAmount: '101',
    challengeDuration: '',
  },
}

let action2 = {
  //Agreement.sol: getAction(actionID)
  disputable: '', //Address of the disputable that created the action
  disputableActionId: '24',
  collateralId: '',
  endDate: 1592913996969, //Timestamp when the disputable action ends unless it's closed beforehand
  state: 'Challenged', //Submitted, Challenged, Closed
  submitter: '0xff4643B0161F92b8b568Af62be313E41F32E4baD', //Facu's address
  context: 'Link',
  currentChallengeId: '35',
  //if currentChallengeId != null
  challenge: {
    //Agreement.sol: getChallenge(challengeId)
    actionId: '',
    challenger: '0xa9aC50dCe74C46025DC9dCeAFb4FA21f0Dc142ea', //my address
    endDate: Date.now() + 30 * 1000 * 60 * 60, //is the same as action.endDate?
    context: 'link',
    settlementOffer: '12000000000000000000',
    arbitratorFeeAmount: '1800000000000000000',
    arbitratorFeeToken: 'ANT',
    state: 'Waiting', //Waiting, Settled, Disputed, Rejected, Accepted, Voided
    submitterFinishedEvidence: false,
    challengerFinishedEvidence: true,
    disputeId: '24',
    ruling: '',
  },
  //if collateralId != null
  collateral: {
    //Agreement.sol: getCollateralRequirement(disputableAppAddress,collateralId)
    collateralToken: 'ANT',
    actionAmount: '100',
    challengeAmount: '101',
    challengeDuration: '',
  },
}

let date = new Date().getTime() + 3600 * 60 * 48
let action3 = {
  //Agreement.sol: getAction(actionID)
  disputable: '', //Address of the disputable that created the action
  disputableActionId: '24',
  collateralId: '',
  endDate: date, //Timestamp when the disputable action ends unless it's closed beforehand
  state: 'Challenged', //Submitted, Challenged, Closed
  submitter: '0xff4643B0161F92b8b568Af62be313E41F32E4baD', //Facu's address
  context: 'Link',
  currentChallengeId: '35',
  //if currentChallengeId != null
  challenge: {
    //Agreement.sol: getChallenge(challengeId)
    actionId: '',
    challenger: '0xa9aC50dCe74C46025DC9dCeAFb4FA21f0Dc142ea', //my address
    endDate: Date.now() + 30 * 1000 * 60 * 60, //is the same as action.endDate?
    context: 'link',
    settlementOffer: '12000000000000000000',
    arbitratorFeeAmount: '1800000000000000000',
    arbitratorFeeToken: 'ANT',
    state: 'Settled', //Waiting, Settled, Disputed, Rejected, Accepted, Voided
    submitterFinishedEvidence: false,
    challengerFinishedEvidence: true,
    disputeId: '24',
    ruling: '',
  },
  //if collateralId != null
  collateral: {
    //Agreement.sol: getCollateralRequirement(disputableAppAddress,collateralId)
    collateralToken: 'ANT',
    actionAmount: '100',
    challengeAmount: '101',
    challengeDuration: '',
  },
}

export function getMockVoteActionById(id) {
  if (id == 13 || id == '13') {
    return action1
  }
  if (id == 12 || id == '12') {
    return action2
  }
  return action3
}

export function getAgreement() {
  return {
    tokenSymbol: 'ANT',
    collateralAmount: 100,
    agreementTitle: 'EthicalDAO Agreement.',
  }
}
