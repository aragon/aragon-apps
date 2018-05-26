import React from 'react'
import SurveyCard from '../SurveyCard/SurveyCard'

class Surveys extends React.Component {
  static defaultProps = {
    onOpenSurveyDetails: () => {},
    onOpenVotingPanel: () => {},
    onCardRef: () => {},
  }
  getSurveyGroups() {
    const { surveys } = this.props
    const now = new Date()
    return surveys.reduce(
      (groups, survey) => {
        const group = survey.endDate > now ? 'opened' : 'closed'
        return { ...groups, [group]: [...groups[group], survey] }
      },
      { opened: [], closed: [] }
    )
  }
  render() {
    const surveys = this.getSurveyGroups()
    return (
      <React.Fragment>
        {this.renderGroup('Open Surveys', surveys.opened, false)}
        {this.renderGroup('Past Surveys', surveys.closed, true)}
      </React.Fragment>
    )
  }
  renderGroup(title, surveys, past) {
    return (
      <SurveyCard.Group title={title} count={surveys.length}>
        {surveys.map(survey => (
          <SurveyCard
            key={survey.surveyId}
            survey={survey}
            past={past}
            onOpenDetails={this.props.onOpenSurveyDetails}
            onVote={this.props.onOpenVotingPanel}
            onCardRef={this.props.onCardRef}
          />
        ))}
      </SurveyCard.Group>
    )
  }
}

export default Surveys
