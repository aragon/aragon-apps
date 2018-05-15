import React from 'react'
import styled from 'styled-components'
import { AppBar, AppView, AragonApp, Badge, Button } from '@aragon/ui'
import SurveyCard from './components/SurveyCard/SurveyCard'
import NewSurveyPanel from './components/NewSurveyPanel/NewSurveyPanel'

// Comment this to disable the demo state
import * as demoState from './demo-state'

class App extends React.Component {
  state = {
    surveys: [],
    showNewSurveyPanel: false,
    ...(typeof demoState !== 'undefined' ? demoState : {}),
  }
  getSurveyGroups() {
    const now = new Date()
    return this.state.surveys.reduce(
      (groups, survey) => {
        const group = survey.endDate > now ? 'opened' : 'closed'
        return { ...groups, [group]: [...groups[group], survey] }
      },
      { opened: [], closed: [] }
    )
  }
  handleNewSurveyPanelClose = () => {
    this.setState({ showNewSurveyPanel: false })
  }
  handleNewSurveyPanelOpen = () => {
    this.setState({ showNewSurveyPanel: true })
  }
  render() {
    const surveys = this.getSurveyGroups()
    const { showNewSurveyPanel } = this.state
    return (
      <AragonApp publicUrl="/aragon-ui/">
        <AppView appBar={this.renderAppBar()}>
          {this.renderGroup('Open Surveys', surveys.opened)}
          {this.renderGroup('Past Surveys', surveys.closed)}
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
  renderGroup(title, surveys) {
    return (
      <SurveyCard.Group title={title} count={surveys.length}>
        {surveys.map(({ endDate, question, options }) => (
          <SurveyCard
            key={question}
            endDate={endDate}
            question={question}
            options={options}
          />
        ))}
      </SurveyCard.Group>
    )
  }
}

const AppBarTitle = styled.span`
  display: flex;
  align-items: center;
`

export default App
