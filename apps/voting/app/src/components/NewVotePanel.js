import React from 'react'
import styled from 'styled-components'
import { Button, Field, Info, SidePanel, TabBar, TextInput } from '@aragon/ui'

const initialState = {
  question: '',
  screenIndex: 0,
}

const NewVotePanel = React.memo(({ panelState, onCreateVote }) => (
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
))

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
  handleTabChange = screenIndex => {
    this.setState({ screenIndex })
  }
  handleQuestionChange = event => {
    this.setState({ question: event.target.value })
  }
  handleSubmit = event => {
    event.preventDefault()
    this.props.onCreateVote(this.state.question.trim())
  }
  render() {
    const { question, screenIndex } = this.state
    return (
      <div>
        <div css="margin: 0 -30px 30px">
          <TabBar
            items={['Question', 'Action']}
            selected={screenIndex}
            onChange={this.handleTabChange}
          />
        </div>
        {screenIndex === 0 && (
          <Form onSubmit={this.handleSubmit}>
            <Field label="Question">
              <TextInput
                ref={question => (this.questionInput = question)}
                value={question}
                onChange={this.handleQuestionChange}
                required
                wide
              />
            </Field>
            <Button mode="strong" type="submit" wide>
              Begin question
            </Button>
            <div css="margin-top: 20px">
              <Info.Action title="These votes are informative">
                <div
                  css={`
                    margin-top: 5px;
                    font-size: 14px;
                  `}
                >
                  Questions are used for signaling and don’t have any direct
                  repercussions on the organization.
                </div>
              </Info.Action>
            </div>
          </Form>
        )}
        {screenIndex === 1 && (
          <div>
            <Info.Action title="These votes are binding">
              <div
                css={`
                  margin-top: 5px;
                  font-size: 14px;
                `}
              >
                Any actions that require <strong>consensus</strong>, such as
                withdrawing funds or minting tokens, will automatically create a
                binding vote.
              </div>
            </Info.Action>
          </div>
        )}
      </div>
    )
  }
}

const Form = styled.form`
  margin-top: 20px;
`

export default NewVotePanel
