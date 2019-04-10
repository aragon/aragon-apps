import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import color from 'onecolor'
import { format } from 'date-fns'
import { Badge, Countdown, Text, Button, theme } from '@aragon/ui'
import { VOTE_YEA, VOTE_NAY } from '../../vote-types'
import VotingOptions from './VotingOptions'
import VoteText from '../VoteText'
import VoteStatus from '../VoteStatus'

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

    return (
      <Main>
        <Header>
          {open ? (
            <Countdown end={endDate} />
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
                <VoteText text={metadata || description} />
              </span>
            </Label>
            <VotingOptions options={options} votingPower={votingPower} />
          </Content>
          <Footer>
            <SecondaryButton onClick={handleOpen}>View vote</SecondaryButton>
          </Footer>
        </Card>
      </Main>
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

const OptionLabel = ({ label, isConnectedAccount }) => (
  <span>
    <span>{label}</span>
    {isConnectedAccount && <You />}
  </span>
)

const Main = styled.section`
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
  padding-left: 5px;
`

const SecondaryButton = styled(Button).attrs({
  mode: 'secondary',
  compact: true,
})`
  background: ${color(theme.secondaryBackground)
    .alpha(0.8)
    .cssa()};
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

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
`

const You = styled(Badge.Identity).attrs({ children: 'Your vote' })`
  margin-left: 5px;
  font-size: 9px;
  text-transform: uppercase;
`

export default VotingCard
