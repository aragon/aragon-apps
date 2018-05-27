import React from 'react'
import SurveyCard from '../SurveyCard/SurveyCard'

class Surveys extends React.Component {
  static defaultProps = {
    onOpenSurvey: () => {},
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
        {this.renderGroup('Open Surveys', surveys.opened)}
        {this.renderGroup('Past Surveys', surveys.closed)}
      </React.Fragment>
    )
  }
  renderGroup(title, surveys) {
    return (
      <SurveyCard.Group title={title} count={surveys.length}>
        {surveys.map(({ id, endDate, question, options }) => (
          <SurveyCard
            key={id}
            id={id}
            endDate={endDate}
            question={question}
            options={options}
            onOpenSurvey={this.props.onOpenSurvey}
            onCardRef={this.props.onCardRef}
          />
        ))}
      </SurveyCard.Group>
    )
  }
}

export default Surveys
