import React from 'react'
import styled from 'styled-components'
import {
  Button,
  Field,
  GU,
  Info,
  SidePanel,
  TextInput,
  textStyle,
  useTheme,
} from '@aragon/ui'

const initialState = {
  question: '',
}

const NewVotePanel = React.memo(({ panelState, onCreateVote }) => {
  const theme = useTheme()
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
        theme={theme}
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
    const { theme } = this.props
    const { question } = this.state
    return (
      <div>
        <Form onSubmit={this.handleSubmit}>
          <label>
            <div
              css={`
                margin-bottom: ${1 * GU}px;
                color: ${theme.surfaceContentSecondary};
                ${textStyle('label2')};
              `}
            >
              Question{' '}
              <span
                css={`
                  color: ${theme.accent};
                `}
              >
                *
              </span>
            </div>
            <TextInput
              ref={question => (this.questionInput = question)}
              value={question}
              onChange={this.handleQuestionChange}
              required
              wide
            />
          </label>
          <div
            css={`
              margin: ${2 * GU}px 0;
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
        </Form>
      </div>
    )
  }
}

const Form = styled.form`
  margin-top: 20px;
`

export default NewVotePanel
