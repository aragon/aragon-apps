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
    return surveys.reduce(
      (groups, survey) => {
        const group = survey.data.open ? 'opened' : 'closed'
        return { ...groups, [group]: [...groups[group], survey] }
      },
      { opened: [], closed: [] }
    )
  }
  render() {
    const surveys = this.getSurveyGroups()
    return (
      <React.Fragment>
        {this.renderGroup('Open Surveys', surveys.opened)}
        {this.renderGroup('Past Surveys', surveys.closed)}
      </React.Fragment>
    )
  }
  renderGroup(title, surveys) {
    if (surveys.length === 0) {
      return null
    }
    return (
      <SurveyCard.Group title={title} count={surveys.length}>
        {surveys.map(survey => (
          <SurveyCard
            key={survey.surveyId}
            survey={survey}
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
