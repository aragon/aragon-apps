import React from 'react'
import styled from 'styled-components'
import color from 'onecolor'
import { format } from 'date-fns'
import { Countdown, Text, Button, Badge, theme } from '@aragon/ui'
import SurveyCardGroup from './SurveyCardGroup'
import SurveyOptions from '../SurveyOptions/SurveyOptions'

const OPTIONS_DISPLAYED = 3

class SurveyCard extends React.Component {
  static defaultProps = {
    options: [],
  }
  handleVote = () => {
    this.props.onVote(this.props.survey.surveyId)
  }
  handleOpenDetails = () => {
    this.props.onOpenDetails(this.props.survey.surveyId)
  }
  handleCardRef = element => {
    this.props.onCardRef({ id: this.props.survey.surveyId, element })
  }
  render() {
    const { survey, past, showProgress } = this.props
    const {
      endDate,
      metadata: { question },
      options,
      votingPower,
    } = survey

    return (
      <Main>
        <Header>
          {past ? (
            <PastDate dateTime={format(endDate, 'yyyy-MM-dd[T]HH:mm:ss')}>
              {format(endDate, 'dd MMM yyyy HH:mm')}
            </PastDate>
          ) : (
            <Countdown end={endDate} />
          )}
        </Header>
        <Card innerRef={this.handleCardRef}>
          <Content>
            <Question>
              <Text>{question}</Text>
            </Question>
            <SurveyOptions
              options={options}
              optionsDisplayed={OPTIONS_DISPLAYED}
              totalPower={votingPower}
            />
            {options.length > OPTIONS_DISPLAYED && (
              <More>
                <Button.Anchor mode="text" onClick={this.handleOpenDetails}>
                  <Badge
                    background={color(theme.infoBackground)
                      .alpha(0.8)
                      .cssa()}
                    foreground={color(theme.textSecondary)
                      .alpha(0.7)
                      .cssa()}
                  >
                    +{options.length - OPTIONS_DISPLAYED} more
                  </Badge>
                </Button.Anchor>
              </More>
            )}
          </Content>
          {past ? (
            <PastFooter onOpenDetails={this.handleOpenDetails} />
          ) : (
            <ActiveFooter
              onOpenDetails={this.handleOpenDetails}
              onVote={this.handleVote}
            />
          )}
        </Card>
      </Main>
    )
  }
}

const Main = styled.section`
  display: flex;
  flex-direction: column;
`

const Header = styled.div`
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

const Question = styled.h1`
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

const More = styled.div`
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: center;
`

const Footer = styled.div`
  display: flex;
  justify-content: ${({ alignRight }) =>
    alignRight ? 'flex-end' : 'space-between'};
  flex-shrink: 0;
`

const ActiveFooter = ({ onOpenDetails, onVote }) => (
  <Footer>
    <Button.Anchor
      mode="text"
      compact
      style={{ paddingLeft: '0' }}
      onClick={onOpenDetails}
    >
      View details
    </Button.Anchor>
    <SecondaryButton onClick={onVote}>Vote</SecondaryButton>
  </Footer>
)

const PastFooter = ({ onOpenDetails }) => (
  <Footer alignRight>
    <SecondaryButton onClick={onOpenDetails}>View details</SecondaryButton>
  </Footer>
)

SurveyCard.Group = SurveyCardGroup
SurveyCard.Card = Card

export default SurveyCard
