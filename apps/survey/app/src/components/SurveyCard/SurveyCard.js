import React from 'react'
import styled from 'styled-components'
import color from 'onecolor'
import posed from 'react-pose'
import { format } from 'date-fns'
import { Countdown, Text, Button, Badge, theme } from '@aragon/ui'
import SurveyCardGroup from './SurveyCardGroup'
import SurveyCardOption from './SurveyCardOption'

const OPTIONS_DISPLAYED = 3
const ANIM_DELAY_MAX = 200

class SurveyCard extends React.Component {
  static defaultProps = {
    options: [],
  }
  state = {
    show: false,
  }
  componentDidMount() {
    this._transitionTimer = setTimeout(() => {
      this.setState({ show: true })
    }, Math.random() * ANIM_DELAY_MAX)
  }
  componentWillUnmount() {
    clearTimeout(this._transitionTimer)
  }
  render() {
    const { endDate, question, options: unsortedOptions } = this.props
    const { show } = this.state
    const options = unsortedOptions.sort((a, b) => a.value > b.value)
    const past = endDate < new Date()
    return (
      <Main>
        <Header>
          {past ? (
            <PastDate datetime={format(endDate, 'YYYY-MM-DDTHH:mm:ss')}>
              {format(endDate, 'DD MMM YYYY HH:mm')}
            </PastDate>
          ) : (
            <Countdown end={endDate} />
          )}
        </Header>
        <Card pose={show ? 'show' : 'hide'}>
          <Content>
            <Question>
              <Text>{question}</Text>
            </Question>
            {options
              .slice(0, OPTIONS_DISPLAYED)
              .map(option => (
                <SurveyCardOption key={option.label} {...option} />
              ))}
            {options.length > OPTIONS_DISPLAYED && (
              <More>
                <Button.Anchor mode="text">
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
          {this.renderFooter(past)}
        </Card>
      </Main>
    )
  }
  renderFooter(past) {
    if (past) {
      return (
        <Footer alignRight>
          <SecondaryButton>View details</SecondaryButton>
        </Footer>
      )
    }
    return (
      <Footer>
        <Button.Anchor mode="text" compact style={{ marginLeft: '-15px' }}>
          View details
        </Button.Anchor>
        <SecondaryButton>Vote</SecondaryButton>
      </Footer>
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

const Card = posed(styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px 30px;
  background: #ffffff;
  border: 1px solid rgba(209, 209, 209, 0.5);
  border-radius: 3px;
`)({
  show: {
    staggerChildren: 50,
  },
  hide: {},
})

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

SurveyCard.Group = SurveyCardGroup

export default SurveyCard
