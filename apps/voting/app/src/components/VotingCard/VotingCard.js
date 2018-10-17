import React from 'react'
import styled from 'styled-components'
import color from 'onecolor'
import { format } from 'date-fns'
import { Countdown, Text, Button, theme } from '@aragon/ui'
import VotingOptions from './VotingOptions'

class VotingCard extends React.Component {
  static defaultProps = {
    options: [],
    onOpen: () => {},
    status: null,
  }
  handleOpen = () => {
    this.props.onOpen(this.props.id)
  }
  render() {
    const {
      options,
      endDate,
      question,
      open,
      totalVoters,
      status,
      id,
    } = this.props
    return (
      <Main>
        <Header>
          {open ? (
            <Countdown end={endDate} />
          ) : (
            <PastDate dateTime={format(endDate, 'yyyy-MM-dd[T]HH:mm:ss')}>
              {format(endDate, 'dd MMM yyyy HH:mm')}
            </PastDate>
          )}

          {status}
        </Header>
        <Card>
          <Content>
            <Question>
              <Text color={theme.textTertiary}>#{id} </Text>
              <span>{question}</span>
            </Question>
            <VotingOptions totalVoters={totalVoters} options={options} />
          </Content>
          <Footer>
            <SecondaryButton onClick={this.handleOpen}>
              View vote
            </SecondaryButton>
          </Footer>
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

const Footer = styled.div`
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
`

export default VotingCard
