import React from 'react'
import { Button, Info, TextInput, Field } from '@aragon/ui'

class NewVotePanelContent extends React.Component {
  static defaultProps = {
    onCreateVote: () => {},
  }
  state = {
    question: '',
  }
  componentWillReceiveProps({ opened }) {
    if (opened && !this.props.opened) {
      this.setState({ question: '' })
    }
  }
  handleQuestionChange = event => {
    this.setState({ question: event.target.value })
  }
  handleSubmit = event => {
    event.preventDefault()
    this.props.onCreateVote(this.state.question.trim())
  }
  render() {
    const { question } = this.state
    return (
      <div>
        <Field>
          <Info.Action title="Votes are informative">
            They don’t have any direct repercussion on the organization.
          </Info.Action>
        </Field>

        <form onSubmit={this.handleSubmit}>
          <Field label="Question">
            <TextInput
              value={question}
              onChange={this.handleQuestionChange}
              required
              wide
            />
          </Field>
          <Button mode="strong" type="submit" wide>
            Begin Vote
          </Button>
        </form>
      </div>
    )
  }
}

export default NewVotePanelContent
