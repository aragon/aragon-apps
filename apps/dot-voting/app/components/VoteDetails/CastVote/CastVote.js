import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import { Button, Text, useTheme } from '@aragon/ui'
import Label from '../Label'
import { BN } from 'web3-utils'
import EditVoteOption from './EditVoteOption'

const CastVote = ({ onVote, toggleVotingMode, vote, voteWeights, votingPower }) => {
  const theme = useTheme()

  const [ voteAmounts, setVoteAmounts ] = useState(
    voteWeights.length
      ? voteWeights
      : Array.from(Array(vote.data.options.length), () => '')
  )

  const [ remaining, setRemaining ] = useState(
    100 - voteAmounts.reduce((sum, n) => sum + Number(n), 0)
  )

  const updateVoteAmount = (idx, newValue) => {
    if (Number(newValue) < 0) return

    const newVoteAmounts = [...voteAmounts]
    newVoteAmounts[idx] = String(newValue)
    const total = newVoteAmounts.reduce((sum, n) => sum + Number(n), 0)

    if (total <= 100) {
      setRemaining(100 - total)
      setVoteAmounts(newVoteAmounts)
    }
  }

  const handleVoteSubmit = useCallback((e) => {
    e.preventDefault()
    const votingPowerBN = new BN(votingPower, 10)
    const optionsArray = voteAmounts.map(value => {
      const baseValue = value ? new BN(value, 10) : new BN('0', 10)
      const voteWeight = baseValue.mul(votingPowerBN).div(new BN('100', 10))
      return voteWeight.toString(10)
    })
    onVote(vote.voteId, optionsArray)
  }, [ vote.voteId, onVote, votingPower, voteAmounts ])

  return (
    <form onSubmit={handleVoteSubmit} css="width: 100%">
      <div css="display: flex; justify-content: space-between">
        <Label>Your vote</Label>
        <Label>Percentage</Label>
      </div>

      {vote.data.options.map((option, index) => (
        <EditVoteOption
          key={index}
          onUpdate={updateVoteAmount.bind(null, index)}
          label={option.label}
          value={voteAmounts[index]}
        />
      ))}

      <Text.Block
        size="small"
        color={`${theme.surfaceContentSecondary}`}
      >
        <span css="font-weight: bold; float: right">
          You have <span css={`color: ${theme.accent}`}>{remaining}</span> dots remaining
        </span>
      </Text.Block>

      <div css="display: flex; justify-content: flex-end; align-items: center; width: 100%">
        <Button type="button" onClick={toggleVotingMode}>
          Cancel
        </Button>
        <Button
          css="margin: 1rem 0 1rem 0.5rem"
          mode="strong"
          type="submit"
          disabled={remaining === 100}
        >
          Submit vote
        </Button>
      </div>
    </form>
  )
}

CastVote.propTypes = {
  onVote: PropTypes.func.isRequired,
  toggleVotingMode: PropTypes.func.isRequired,
  vote: PropTypes.shape({
    data: PropTypes.shape({
      options: PropTypes.PropTypes.arrayOf(PropTypes.object).isRequired,
      snapshotBlock: PropTypes.number.isRequired,
    }).isRequired,
    voteId: PropTypes.string.isRequired,
  }).isRequired,
  voteWeights: PropTypes.array.isRequired,
  votingPower: PropTypes.string.isRequired,
}

export default CastVote
