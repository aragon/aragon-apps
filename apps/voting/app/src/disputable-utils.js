export function hasDispute(vote) {
  return (
    vote.disputable &&
    vote.disputable.action &&
    vote.disputable.action.challenge
  )
}
