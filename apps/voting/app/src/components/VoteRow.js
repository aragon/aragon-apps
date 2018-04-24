import React from 'react'
import styled from 'styled-components'
import { Button, Countdown, TableCell, TableRow } from '@aragon/ui'
import ProgressBar from './ProgressBar'
import VoteStatus from './VoteStatus'
import { safeDiv } from '../math-utils'

class VoteRow extends React.Component {
  static defaultProps = {
    onSelectVote: () => {},
  }

  handleVoteClick = () => {
    this.props.onSelectVote(this.props.vote.voteId)
  }
  render() {
    const { vote } = this.props
    const { endDate, open } = vote
    const { metadata: question, description, nay, totalVoters, yea } = vote.data
    const totalVotes = safeDiv(yea + nay, totalVoters)

    return (
      <TableRow>
        <StatusCell>
          {open ? <Countdown end={endDate} /> : <VoteStatus vote={vote} />}
        </StatusCell>
        <QuestionCell>
          <div>
            {question && (
              <QuestionWrapper>
                {description ? <strong>{question}</strong> : question}
              </QuestionWrapper>
            )}
            {description && (
              <DescriptionWrapper>{description}</DescriptionWrapper>
            )}
          </div>
        </QuestionCell>
        <Cell align="right">{Math.round(totalVotes * 10000) / 100}%</Cell>
        <BarsCell>
          <BarsGroup>
            <Bar>
              <ProgressBar
                type="positive"
                progress={safeDiv(yea, totalVoters)}
              />
            </Bar>
            <Bar>
              <ProgressBar
                type="negative"
                progress={safeDiv(nay, totalVoters)}
              />
            </Bar>
          </BarsGroup>
        </BarsCell>
        <ActionsCell>
          <Button mode="outline" onClick={this.handleVoteClick}>
            View Vote
          </Button>
        </ActionsCell>
      </TableRow>
    )
  }
}

const Cell = styled(TableCell)`
  vertical-align: top;
`

const StatusCell = styled(Cell)`
  vertical-align: top;
  width: 190px;
`

const QuestionCell = styled(Cell)`
  width: 40%;
`

const BarsCell = styled(Cell)`
  flex-shrink: 0;
  width: 25%;
  min-width: 200px;
`

const ActionsCell = styled(Cell)`
  width: 0;
`

const QuestionWrapper = styled.p`
  margin-right: 20px;
  word-break: break-word;
  hyphens: auto;
`

const DescriptionWrapper = styled.p`
  margin-right: 20px;

  ${QuestionWrapper} + & {
    margin-top: 10px;
  }
`

const BarsGroup = styled.div`
  width: 100%;
`

const Bar = styled.div`
  &:not(:first-child) {
    margin-top: 20px;
  }
`

export default VoteRow
