module.exports = web3 => {
  const { bigExp } = require('@aragon/test-helpers/numbers')(web3)

  const pct = x => bigExp(x, 16)

  const getVoteState = async (voting, id) => {
    const isOpen = await voting.isVoteOpen(id)
    const [isExecuted, startDate, snapshotBlock, support, quorum, overruleWindow, earlyExecution, yeas, nays, votingPower, script] = await voting.getVote(id)

    return { isOpen, isExecuted, startDate, snapshotBlock, support, quorum, overruleWindow, earlyExecution, yeas, nays, votingPower, script }
  }

  return {
    pct,
    getVoteState
  }
}
