import React from 'react'
import styled from 'styled-components'
import { AppBar, Badge, Button } from '@aragon/ui'
import { Transition, animated } from 'react-spring'
import LeftIcon from './LeftIcon'
import springs from '../../springs'

const AppBarWrapper = ({ token, onOpenNewSurveyPanel, view, onBack }) => (
  <AppBar
    title={
      <Container>
        <Transition
          native
          from={{ opacity: 0, position: -1 }}
          enter={{ opacity: 1, position: 0 }}
          leave={{ opacity: 0, position: -1 }}
          token={token}
        >
          {view === 'surveys' && TitleSurveys}
        </Transition>
        <Transition
          native
          from={{ opacity: 0, position: 1 }}
          enter={{ opacity: 1, position: 0 }}
          leave={{ opacity: 0, position: 1 }}
          token={token}
          onBack={onBack}
        >
          {view === 'survey' && TitleSurvey}
        </Transition>
      </Container>
    }
    endContent={
      <Button mode="strong" disabled onClick={onOpenNewSurveyPanel}>
        New Survey
      </Button>
    }
  />
)

const TitleSurveys = ({ opacity, position, token }) => (
  <animated.span
    style={{
      opacity,
      transform: position.interpolate(p => `translate(${p * 20}px, -50%)`),
    }}
  >
    <Title>
      <span>Survey</span>
      <SpacedBadge>{token}</SpacedBadge>
    </Title>
  </animated.span>
)

const TitleSurvey = ({ opacity, position, token, onBack }) => (
  <animated.span
    style={{
      opacity,
      transform: position.interpolate(p => `translate(${p * 20 - 30}px, -50%)`),
    }}
  >
    <Title>
      <BackButton onClick={onBack}>
        <LeftIcon />
      </BackButton>
      <span>Survey Details</span>
      <SpacedBadge>{token}</SpacedBadge>
    </Title>
  </animated.span>
)

const Container = styled.span`
  display: flex;
  position: relative;
  height: 100%;
`

const SpacedBadge = styled(Badge)`
  margin-left: 10px;
`

const BackButton = styled.span`
  display: flex;
  align-items: center;
  height: 63px;
  padding: 0 30px;
  cursor: pointer;
  svg path {
    fill: hsl(179, 76%, 48%);
  }
  :active svg path {
    fill: hsl(179, 76%, 63%);
  }
`

const Title = styled.span`
  display: flex;
  align-items: center;
  position: absolute;
  left: 0;
  top: 0;
  transform: translateY(-50%);
`

export default AppBarWrapper
