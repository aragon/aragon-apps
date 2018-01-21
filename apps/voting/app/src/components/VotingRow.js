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
            {opened && (
              <div>
                <Button mode="outline" compact onClick={this.handleVoteClick}>
                  Vote
                </Button>
              </div>
            )}
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
          </BarsGroup>
          {false && (
            <ButtonsGroup>
              <ButtonWrapper>
                <Button mode="outline" emphasis="positive" compact wide>
                  Yes
                </Button>
              </ButtonWrapper>
              <ButtonWrapper>
                <Button mode="outline" emphasis="negative" compact wide>
                  No
                </Button>
              </ButtonWrapper>
            </ButtonsGroup>
          )}
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
  min-width: 25%;
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

const ButtonsGroup = styled.div`
  display: flex;
  min-width: 200px;
`
const ButtonWrapper = styled.div`
  width: 50%;
  &:first-child {
    margin-right: 10px;
  }
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
