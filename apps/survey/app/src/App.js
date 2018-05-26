import React from 'react'
import { AppView, AragonApp } from '@aragon/ui'
import { Transition, animated } from 'react-spring'
import NewSurveyPanel from './components/NewSurveyPanel/NewSurveyPanel'
import VotingPanel from './components/VotingPanel/VotingPanel'
import Survey from './components/Survey/Survey'
import Surveys from './components/Surveys/Surveys'
import AppBar from './components/AppBar/AppBar'

// Comment this to disable the demo state
import * as demoState from './demo-state'

const PANEL_VOTING = Symbol('PANEL_VOTING')
const PANEL_NEW_SURVEY = Symbol('PANEL_NEW_SURVEY')

class App extends React.Component {
  state = {
    surveys: [],
    openedSurveyId: null,
    openedSurveyRect: {},
    votingPanelOpened: false,
    votingPanelSurveyId: null,
    showPanel: null,

    ...(typeof demoState !== 'undefined' ? demoState : {}),
  }
  getSurvey = id => {
    return this.state.surveys.find(survey => survey.id === id)
  }
  handleOpenSurveyDetails = id => {
    // Try to get the card rectangle before opening it
    // So we can animate from the card to the expanded view
    const cardElt = this._cardRefs.get(id)
    const rect = cardElt ? cardElt.getBoundingClientRect() : null
    this.setState({ openedSurveyId: id, openedSurveyRect: rect })
  }
  handlePanelClose = () => {
    this.setState({
      openedSurveyId: false,
      showNewSurveyPanel: false,
      votingPanelOpened: false,
    })
  }
  handleOpenVotingPanel = id => {
    this.setState({
      votingPanelOpened: true,
      votingPanelSurveyId: id,
    })
  }
  handleOpenNewSurveyPanel = () => {
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
      votingPanelSurveyId,
      votingPanelOpened,
      showPanel,
      surveys,
    } = this.state
    const openedSurvey = this.getSurvey(openedSurveyId)
    const votingPanelSurvey = this.getSurvey(votingPanelSurveyId)
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <AppView
          appBar={
            <AppBar
              token="ANT"
              onOpenNewSurveyPanel={this.handleOpenNewSurveyPanel}
            />
          }
        >
          <Transition
            native
            from={{ showProgress: 0 }}
            enter={{ showProgress: 1 }}
            leave={{ showProgress: 0 }}
            surveys={surveys}
            onCardRef={this.handleCardRef}
            onOpenVotingPanel={this.handleOpenVotingPanel}
            onCloseVotingPanel={this.handleCloseVotingPanel}
            onOpenSurveyDetails={this.handleOpenSurveyDetails}
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
          opened={showPanel === PANEL_NEW_SURVEY}
          onClose={this.handlePanelClose}
        />
        <VotingPanel
          survey={votingPanelSurvey}
          opened={votingPanelOpened}
          onClose={this.handlePanelClose}
        />
      </AragonApp>
    )
  }
}

const SurveysWrapper = ({
  showProgress,
  surveys,
  onOpenSurveyDetails,
  onOpenVotingPanel,
  onCloseVotingPanel,
  onCardRef,
}) => (
  <animated.div style={{ opacity: showProgress }}>
    <Surveys
      surveys={surveys}
      onOpenSurveyDetails={onOpenSurveyDetails}
      onOpenVotingPanel={onOpenVotingPanel}
      onCloseVotingPanel={onCloseVotingPanel}
      onCardRef={onCardRef}
    />
  </animated.div>
)

export default App
