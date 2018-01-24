import React from 'react'
import styled from 'styled-components'
import { Button, Countdown, TableCell, TableRow } from '@aragon/ui'
import { VOTE_UNKNOWN } from '../vote-types'
import ProgressBar from './ProgressBar'
import VotingStatus from './VotingStatus'

class VotingRow extends React.Component {
  handleVoteClick = () => {
    this.props.onSelectVote(this.props.id)
  }
  render() {
    const {
      id,
      endDate,
      question,
      votesYes,
      votesNo,
      pending,
      userVote,
      tokensCount,
      opened,
    } = this.props
    const totalVotes = votesYes + votesNo
    return (
      <TableRow>
        <StatusCell>
          {opened ? (
            <Countdown end={endDate} />
          ) : (
            <VotingStatus
              votesYes={votesYes}
              votesNo={votesNo}
              opened={opened}
            />
          )}
        </StatusCell>
        <QuestionCell>
          <QuestionWrapper>
            <div>{question}</div>
          </QuestionWrapper>
        </QuestionCell>
        <Cell align="right">{totalVotes}</Cell>
        {opened && <Cell align="right">{pending}</Cell>}
        <LastCell>
          <BarsGroup>
            <Bar>
              <ProgressBar
                progress={totalVotes > 0 ? votesYes / tokensCount : 0}
              />
            </Bar>
            <Bar>
              <ProgressBar
                positive={false}
                progress={totalVotes > 0 ? votesNo / tokensCount : 0}
              />
            </Bar>
            {opened && (
              <ButtonWrapper>
                <Button
                  mode="outline"
                  compact
                  wide
                  onClick={this.handleVoteClick}
                >
                  Vote
                </Button>
              </ButtonWrapper>
            )}
          </BarsGroup>
        </LastCell>
      </TableRow>
    )
  }
}

VotingRow.defaultProps = {
  question: '',
  votesYes: 0,
  votesNo: 0,
  pending: 0,
  userVote: VOTE_UNKNOWN,
  opened: false,
  onSelectVote: () => {},
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

const LastCell = styled(Cell)`
  flex-shrink: 0;
  width: 25%;
  min-width: 200px;
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
  margin-top: 20px;
  &:first-child {
    margin-top: 0;
  }
`

const ButtonWrapper = styled.div`
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
`

export default VotingRow
