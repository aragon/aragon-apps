import React from 'react'
import styled from 'styled-components'
import {
  Button,
  Countdown,
  TableCell,
  TableRow,
  theme,
  IconTime,
  IconCross,
  IconCheck,
} from '@aragon/ui'
import { VOTE_UNKNOWN } from '../vote-types'
import ProgressBar from './ProgressBar'

const STATUSES = {
  timeout: { label: 'Time out', Icon: IconTime, color: theme.textSecondary },
  approved: { label: 'Approved', Icon: IconCheck, color: theme.positive },
  rejected: { label: 'Rejected', Icon: IconCross, color: theme.negative },
}

const getStatus = (votesYes, votesNo) => {
  if (votesYes === 0 && votesNo === 0) return STATUSES.timeout
  if (votesYes >= votesNo) return STATUSES.approved
  return STATUSES.rejected
}

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
      opened,
    } = this.props
    const status = getStatus(votesYes, votesNo)
    const totalVotes = votesYes + votesNo
    return (
      <TableRow>
        <StatusCell>
          {opened ? (
            <Countdown end={endDate} />
          ) : (
            <Status color={status.color}>
              <status.Icon />
              <StatusLabel>{status.label}</StatusLabel>
            </Status>
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
                progress={totalVotes > 0 ? votesYes / totalVotes : 0}
              />
            </Bar>
            <Bar>
              <ProgressBar
                positive={false}
                progress={totalVotes > 0 ? votesNo / totalVotes : 0}
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

const Status = styled.span`
  font-weight: 600;
  white-space: nowrap;
  color: ${({ color }) => color};
`

const StatusLabel = styled.span`
  margin-left: 10px;
`

export default VotingRow
