const { bigExp } = require('@aragon/apps-agreement/test/helpers/lib/numbers')

const pct = x => bigExp(x, 16)

const getVoteState = async (voting, id) => {
  const isOpen = await voting.isVoteOpen(id)
  const { executed, startDate, snapshotBlock, supportRequired, minAcceptQuorum, voteOverruleWindow, earlyExecution, yea, nay, votingPower, script } = await voting.getVote(id)
  return { isOpen, isExecuted: executed, startDate, snapshotBlock, support: supportRequired, quorum: minAcceptQuorum, overruleWindow: voteOverruleWindow, earlyExecution, yeas: yea, nays: nay, votingPower, script }
}

module.exports = {
  pct,
  getVoteState
}
