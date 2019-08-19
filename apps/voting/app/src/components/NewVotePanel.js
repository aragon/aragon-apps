import React from 'react'
import { Button, GU, Info, Field, SidePanel, TextInput } from '@aragon/ui'

const initialState = {
  question: '',
}

const NewVotePanel = React.memo(({ panelState, onCreateVote }) => {
  return (
    <SidePanel
      title="New Vote"
      opened={panelState.visible}
      onClose={panelState.requestClose}
      onTransitionEnd={panelState.onTransitionEnd}
    >
      <NewVotePanelContent
        onCreateVote={onCreateVote}
        panelOpened={panelState.didOpen}
      />
    </SidePanel>
  )
})

class NewVotePanelContent extends React.PureComponent {
  static defaultProps = {
    onCreateVote: () => {},
  }
  state = {
    ...initialState,
  }
  componentWillReceiveProps({ panelOpened }) {
    if (panelOpened && !this.props.panelOpened) {
      // setTimeout is needed as a small hack to wait until the input's on
      // screen until we call focus
      this.questionInput && setTimeout(() => this.questionInput.focus(), 0)
    } else if (!panelOpened && this.props.panelOpened) {
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
        <form
          css={`
            margin-top: ${3 * GU}px;
          `}
          onSubmit={this.handleSubmit}
        >
          <Field label="Question">
            <TextInput
              ref={question => (this.questionInput = question)}
              value={question}
              onChange={this.handleQuestionChange}
              required
              wide
            />
          </Field>
          <div
            css={`
              margin-bottom: ${3 * GU}px;
            `}
          >
            <Info>
              These votes are informative and used for signaling. They don’t
              have any direct repercussions on the organization.
            </Info>
          </div>
          <Button mode="strong" type="submit" wide>
            Create new vote
          </Button>
        </form>
      </div>
    )
  }
}

export default NewVotePanel
