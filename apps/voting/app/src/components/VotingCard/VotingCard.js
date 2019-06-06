import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { format } from 'date-fns'
import { Badge, Timer, Text, Button, theme } from '@aragon/ui'
import { VOTE_YEA, VOTE_NAY } from '../../vote-types'
import VotingOptions from './VotingOptions'
import VoteText from '../VoteText'
import VoteStatus from '../VoteStatus'
import { isVoteAction } from '../../vote-utils'

function getOptions(yea, nay, connectedAccountVote) {
  return [
    {
      label: (
        <OptionLabel
          label="Yes"
          isConnectedAccount={connectedAccountVote === VOTE_YEA}
        />
      ),
      power: yea,
    },
    {
      label: (
        <OptionLabel
          label="No"
          isConnectedAccount={connectedAccountVote === VOTE_NAY}
        />
      ),
      power: nay,
      color: theme.negative,
    },
  ]
}

const VotingCard = React.memo(
  ({ vote, onOpen }) => {
    const { voteId, connectedAccountVote } = vote
    const { votingPower, yea, nay } = vote.numData
    const { endDate, open, metadata, description } = vote.data

    const handleOpen = useCallback(() => {
      onOpen(voteId)
    }, [voteId, onOpen])

    const options = useMemo(() => getOptions(yea, nay, connectedAccountVote), [
      yea,
      nay,
      connectedAccountVote,
    ])

    const action = isVoteAction(vote)

    return (
      <section
        css={`
          display: flex;
          flex-direction: column;
          min-width: 0;
        `}
      >
        <Header>
          {open ? (
            <Timer end={endDate} maxUnits={4} />
          ) : (
            <PastDate
              dateTime={format(endDate, "yyyy-MM-dd'T'HH:mm:ss.SSSxxx")}
            >
              {format(endDate, 'EEE MMM dd yyyy HH:mm')}
            </PastDate>
          )}

          {open ? null : <VoteStatus vote={vote} cardStyle />}
        </Header>
        <Card>
          <Content>
            <Label>
              <Text color={theme.textTertiary}>#{voteId} </Text>
              <span>
                <VoteText text={description || metadata} />
              </span>
            </Label>
            <VotingOptions options={options} votingPower={votingPower} />
          </Content>
          <div
            css={`
              display: flex;
              justify-content: space-between;
              flex-shrink: 0;
            `}
          >
            <div
              css={`
                display: flex;
                align-items: center;
              `}
            >
              {action ? <BadgeAction /> : <BadgeQuestion />}
            </div>
            <Button compact mode="outline" onClick={handleOpen}>
              View vote
            </Button>
          </div>
        </Card>
      </section>
    )
  },
  (prevProps, nextProps) => {
    const prevVote = prevProps.vote
    const nextVote = nextProps.vote
    return (
      prevProps.onVote === nextProps.onVote &&
      prevVote.voteId === nextVote.voteId &&
      prevVote.connectedAccountVote === nextVote.connectedAccountVote &&
      prevVote.data.endDate === nextVote.data.endDate &&
      prevVote.data.open === nextVote.data.open &&
      prevVote.data.metadata === nextVote.data.metadata &&
      prevVote.data.description === nextVote.data.description &&
      prevVote.numData.votingPower === nextVote.numData.votingPower &&
      prevVote.numData.yea === nextVote.numData.yea &&
      prevVote.numData.nay === nextVote.numData.nay
    )
  }
)

VotingCard.defaultProps = {
  onOpen: () => {},
}

const BadgeQuestion = () => (
  <Badge background="rgba(37, 49, 77, 0.16)" foreground="rgba(37, 49, 77, 1)">
    Question
  </Badge>
)

const BadgeAction = () => (
  <Badge background="rgba(245, 166, 35, 0.1)" foreground="rgba(156, 99, 7, 1)">
    Action
  </Badge>
)

const OptionLabel = ({ label, isConnectedAccount }) => (
  <span>
    <span>{label}</span>
    {isConnectedAccount && <You />}
  </span>
)

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-left: 5px;
`

const Card = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 30px;
  background: #ffffff;
  border: 1px solid rgba(209, 209, 209, 0.5);
  border-radius: 3px;
`

const Content = styled.div`
  height: 100%;
`

const Label = styled.h1`
  display: -webkit-box;
  overflow: hidden;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 25px;
  height: 50px;
  margin-bottom: 10px;
`

const PastDate = styled.time`
  font-size: 13px;
  color: #98a0a2;
`

const You = styled(Badge.Identity).attrs({ children: 'Your vote' })`
  margin-left: 5px;
  font-size: 9px;
  text-transform: uppercase;
`

export default VotingCard
