import React from 'react'
import styled from 'styled-components'
import { AppBar, AppView, AragonApp, Badge, Button } from '@aragon/ui'
import { Transition, animated } from 'react-spring'
import NewSurveyPanel from './components/NewSurveyPanel/NewSurveyPanel'
import Survey from './components/Survey/Survey'
import Surveys from './components/Surveys/Surveys'

// Comment this to disable the demo state
import * as demoState from './demo-state'

class App extends React.Component {
  state = {
    surveys: [],
    openedSurveyId: null,
    openedSurveyRect: {},
    showNewSurveyPanel: false,
    ...(typeof demoState !== 'undefined' ? demoState : {}),
  }
  getSurvey = id => {
    return this.state.surveys.find(survey => survey.surveyId === id)
  }
  handleOpenSurvey = id => {
    // Try to get the card rectangle before opening it
    // So we can animate from the card to the expanded view
    const cardElt = this._cardRefs.get(id)
    const rect = cardElt ? cardElt.getBoundingClientRect() : null
    this.setState({ openedSurveyId: id, openedSurveyRect: rect })
  }
  handleNewSurveyPanelClose = () => {
    this.setState({ showNewSurveyPanel: false })
  }
  handleNewSurveyPanelOpen = () => {
    this.setState({ showNewSurveyPanel: true })
  }
  handleCardRef = ({ id, element }) => {
    if (!this._cardRefs) {
      this._cardRefs = new Map()
    }
    this._cardRefs.set(id, element)
  }
  render() {
    const {
      openedSurveyId,
      openedSurveyRect,
      showNewSurveyPanel,
      surveys,
    } = this.state
    const openedSurvey = this.getSurvey(openedSurveyId)
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <AppView appBar={this.renderAppBar()}>
          <Transition
            from={{ showProgress: 0 }}
            enter={{ showProgress: 1 }}
            leave={{ showProgress: 0 }}
            native
            onOpenSurvey={this.handleOpenSurvey}
            onCardRef={this.handleCardRef}
            surveys={surveys}
          >
            {!openedSurvey && SurveysWrapper}
          </Transition>
          <Survey
            survey={openedSurvey}
            transitionFrom={openedSurveyRect}
            onClose={() => {
              this.setState({ openedSurveyId: null })
            }}
          />
        </AppView>
        <NewSurveyPanel
          opened={showNewSurveyPanel}
          onClose={this.handleNewSurveyPanelClose}
        />
      </AragonApp>
    )
  }
  renderAppBar() {
    return (
      <AppBar
        title={
          <AppBarTitle>
            <span style={{ marginRight: '10px' }}>Survey</span>
            <Badge>ANT</Badge>
          </AppBarTitle>
        }
        endContent={
          <Button mode="strong" onClick={this.handleNewSurveyPanelOpen}>
            New Survey
          </Button>
        }
      />
    )
  }
}

const SurveysWrapper = ({ showProgress, surveys, onOpenSurvey, onCardRef }) => (
  <animated.div style={{ opacity: showProgress }}>
    <Surveys
      surveys={surveys}
      onOpenSurvey={onOpenSurvey}
      onCardRef={onCardRef}
    />
  </animated.div>
)

const AppBarTitle = styled.span`
  display: flex;
  align-items: center;
`

export default App
