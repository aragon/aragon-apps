const getVoteState = async (voting, id) => {
  const [isOpen, isExecuted, startDate, snapshotBlock, support, quorum, overruleWindow, yeas, nays, votingPower, script] = await voting.getVote(id)
  return { isOpen, isExecuted, startDate, snapshotBlock, support, quorum, overruleWindow, yeas, nays, votingPower, script }
}

module.exports = {
  getVoteState
}
