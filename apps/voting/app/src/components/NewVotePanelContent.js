import React from 'react'
import styled from 'styled-components'
import { Button, Info, Text, TextInput, Field } from '@aragon/ui'

const initialState = {
  question: '',
}

class NewVotePanelContent extends React.Component {
  static defaultProps = {
    onCreateVote: () => {},
  }
  state = {
    ...initialState,
  }
  componentWillReceiveProps({ opened }) {
    if (opened && !this.props.opened) {
      // setTimeout is needed as a small hack to wait until the input's on
      // screen until we call focus
      this.questionInput && setTimeout(() => this.questionInput.focus(), 0)
    } else if (!opened && this.props.opened) {
      // Finished closing the panel, so reset its state
      this.setState({ ...initialState })
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
        <Info.Action title="Votes are informative">
          They don’t have any direct repercussion on the organization.
        </Info.Action>
        <Form onSubmit={this.handleSubmit}>
          <Field label="Question">
            <TextInput
              innerRef={question => (this.questionInput = question)}
              value={question}
              onChange={this.handleQuestionChange}
              required
              wide
            />
          </Field>
          <Button mode="strong" type="submit" wide>
            Begin Vote
          </Button>
          <Warning>
            By opening this vote, you will automatically vote yay.
          </Warning>
        </Form>
      </div>
    )
  }
}

const Form = styled.form`
  margin-top: 20px;
`

const Warning = styled(Text.Paragraph).attrs({
  size: 'xsmall',
})`
  margin-top: 10px;
`

export default NewVotePanelContent
