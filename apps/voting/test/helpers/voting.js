const getVoteState = async (voting, id) => {
  const isOpen = await voting.isVoteOpen(id)
  const [isExecuted, startDate, snapshotBlock, support, quorum, overruleWindow, earlyExecution, yeas, nays, votingPower, script] = await voting.getVote(id)

  return { isOpen, isExecuted, startDate, snapshotBlock, support, quorum, overruleWindow, earlyExecution, yeas, nays, votingPower, script }
}

module.exports = {
  getVoteState
}
