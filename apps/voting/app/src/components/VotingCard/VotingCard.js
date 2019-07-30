import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { format } from 'date-fns'
import {
  Badge,
  Button,
  Card,
  GU,
  IconCheck,
  Text,
  Timer,
  textStyle,
  theme,
  useTheme,
} from '@aragon/ui'
import { VOTE_YEA, VOTE_NAY } from '../../vote-types'
import VotingOptions from './VotingOptions'
import VoteText from '../VoteText'
import VoteStatus from '../VoteStatus'
import { isVoteAction, getVoteStatus } from '../../vote-utils'
import { useSettings } from '../../vote-settings-manager'
import { VOTE_STATUS_ACCEPTED, VOTE_STATUS_EXECUTED } from '../../vote-types'

function getOptions(yea, nay) {
  return [
    { label: <span>Yes</span>, power: yea },
    { label: <span>No</span>, power: nay, color: theme.negative },
  ]
}

const VotingCard = ({ vote, onOpen }) => {
  const { voteId, data, numData, connectedAccountVote } = vote
  const { votingPower, yea, nay } = numData
  const { open, metadata, description, endDate } = data
  const options = useMemo(() => getOptions(yea, nay), [yea, nay])
  const settings = useSettings()
  const status = getVoteStatus(vote, settings.pctBase)
  const executed = isVoteAction(vote) && status === VOTE_STATUS_EXECUTED
  const youVoted =
    connectedAccountVote === VOTE_YEA || connectedAccountVote === VOTE_NAY
  const handleOpen = useCallback(() => {
    onOpen(voteId)
  }, [voteId, onOpen])
  const theme = useTheme()

  return (
    <Card
      onClick={handleOpen}
      css={`
        display: grid;
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr auto auto;
        grid-gap: 8px;
        padding: ${3 * GU}px;
      `}
    >
      <div
        css={`
          display: flex;
          justify-content: space-between;
        `}
      >
        <Badge.App>App Badge</Badge.App>
        {youVoted && (
          <div
            css={`
              display: inline-flex;
              align-items: center;
              justify-content: center;
              width: 20px;
              height: 20px;
              border-radius: 50%;
              background: ${theme.infoSurface.alpha(0.08)};
              color: ${theme.info};
            `}
          >
            <IconCheck size="tiny" />
          </div>
        )}
      </div>
      <div
        css={`
          ${textStyle('body1')};
          /* lines per font size per line height */
          /* shorter texts align to the top */
          height: 84px;
          display: -webkit-box;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
          overflow: hidden;
        `}
      >
        <VoteText text={description || metadata} />
      </div>
      <VotingOptions options={options} votingPower={votingPower} />
      {open ? (
        <Timer end={endDate} maxUnits={4} />
      ) : (
        <VoteStatus vote={vote} cardStyle />
      )}
    </Card>
  )
}

const _VotingCard = React.memo(
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
      (
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
      ),
      votes
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

const _Card = styled.div`
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
