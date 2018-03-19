import React from 'react'
import styled from 'styled-components'
import { Button, Countdown, TableCell, TableRow } from '@aragon/ui'
import ProgressBar from './ProgressBar'
import VoteStatus from './VoteStatus'

class VoteRow extends React.Component {
  static defaultProps = {
    onSelectVote: () => {},
  }

  handleVoteClick = () => {
    this.props.onSelectVote(this.props.vote.voteId)
  }
  render() {
    const { vote } = this.props
    const { endDate } = vote
    const { metadata, nay, open, totalVoters, yea } = vote.data
    const totalVotes = (yea + nay) / totalVoters

    return (
      <TableRow>
        <StatusCell>
          {open ? <Countdown end={endDate} /> : <VoteStatus vote={vote} />}
        </StatusCell>
        <QuestionCell>
          <QuestionWrapper>
            <div>{metadata}</div>
          </QuestionWrapper>
        </QuestionCell>
        <Cell align="right">{Math.round(totalVotes * 10000) / 100}%</Cell>
        <BarsCell>
          <BarsGroup>
            <Bar>
              <ProgressBar
                type="positive"
                progress={totalVotes > 0 ? yea / totalVoters : 0}
              />
            </Bar>
            <Bar>
              <ProgressBar
                type="negative"
                progress={totalVotes > 0 ? nay / totalVoters : 0}
              />
            </Bar>
          </BarsGroup>
        </BarsCell>
        <ActionsCell>
          <Button mode="outline" onClick={this.handleVoteClick}>
            Open Vote
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

const QuestionWrapper = styled.div`
  display: flex;
  width: 100%;
  justify-content: space-between;
  & > div:first-child {
    width: 100%;
    margin-right: 20px;
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
