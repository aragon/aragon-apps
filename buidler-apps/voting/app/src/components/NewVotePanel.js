import React, { useCallback, useState } from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Field,
  GU,
  Info,
  SidePanel,
  TextInput,
  useSidePanelFocusOnReady,
} from '@aragon/ui'

const NewVotePanel = React.memo(function NewVotePanel({
  panelState,
  onCreateVote,
}) {
  return (
    <SidePanel
      title="New Vote"
      opened={panelState.visible}
      onClose={panelState.requestClose}
    >
      <NewVotePanelContent onCreateVote={onCreateVote} />
    </SidePanel>
  )
})

function NewVotePanelContent({ onCreateVote }) {
  const [question, setQuestion] = useState('')

  const inputRef = useSidePanelFocusOnReady()

  const handleSubmit = useCallback(
    event => {
      event.preventDefault()
      onCreateVote(question.trim())
    },
    [onCreateVote, question]
  )

  const handleQuestionChange = useCallback(event => {
    setQuestion(event.target.value)
  }, [])

  return (
    <div>
      <form
        css={`
          margin-top: ${3 * GU}px;
        `}
        onSubmit={handleSubmit}
      >
        <Field label="Question">
          <TextInput
            ref={inputRef}
            value={question}
            onChange={handleQuestionChange}
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
            These votes are informative and used for signaling. They don’t have
            any direct repercussions on the organization.
          </Info>
        </div>
        <Button disabled={!question} mode="strong" type="submit" wide>
          Create new vote
        </Button>
      </form>
    </div>
  )
}

NewVotePanelContent.propTypes = {
  onCreateVote: PropTypes.func,
}

NewVotePanelContent.defaultProps = {
  onCreateVote: () => {},
}

export default NewVotePanel
