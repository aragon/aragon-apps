import React from 'react'
import { Button, Field, TextInput } from '@aragon/ui'

const initialState = {
  amount: 0,
  recipient: '',
}

const handleFieldChange = (component, field) => event => {
  component.setState({ [field]: event.target.value })
}

class AssignVotePanelContent extends React.Component {
  constructor(props) {
    super(props)
    this.state = {
      ...initialState,
      ...props.recipient,
    }
  }
  componentWillReceiveProps({ opened, recipient }) {
    if (recipient && recipient !== this.props.recipient && opened) {
      // Recipient override passed in from props
      this.setState({ recipient })
    } else if (!opened && this.props.opened) {
      // Finished closing the panel, so reset its state
      this.setState({ ...initialState })
    }
  }
  handleAmountChange = handleFieldChange(this, 'amount')
  handleRecipientChange = handleFieldChange(this, 'recipient')
  handleSubmit = event => {
    const { amount, recipient } = this.state
    event.preventDefault()
    this.props.onAssignTokens({
      amount: Number(amount),
      recipient: recipient.trim(),
    })
  }
  render() {
    const { amount, recipient } = this.state
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <Field label="Recipient">
            <TextInput
              value={recipient}
              onChange={this.handleRecipientChange}
              required
              wide
            />
          </Field>
          <Field label="Number of tokens">
            <TextInput.Number
              value={amount}
              onChange={this.handleAmountChange}
              min={0}
              required
              wide
            />
          </Field>
          <Button mode="strong" type="submit" wide>
            Assign Tokens
          </Button>
        </form>
      </div>
    )
  }
}

AssignVotePanelContent.defaultProps = {
  onAssignTokens: () => {},
}

export default AssignVotePanelContent
