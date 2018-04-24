import React from 'react'
import styled from 'styled-components'
import { Button, Field, IconCross, Text, TextInput } from '@aragon/ui'
import { addressPattern, isAddress } from '../../web3-utils'

const initialState = {
  amount: '',
  recipient: {
    error: null,
    value: '',
  },
}

class AssignVotePanelContent extends React.Component {
  static defaultProps = {
    onAssignTokens: () => {},
  }
  constructor(props) {
    super(props)
    this.state = {
      ...initialState,
      ...props.recipient,
    }
  }
  componentWillReceiveProps({ opened, recipient = '' }) {
    if (opened && !this.props.opened) {
      // setTimeout is needed as a small hack to wait until the input's on
      // screen until we call focus
      this.recipientInput && setTimeout(() => this.recipientInput.focus(), 0)
    }

    if (recipient !== this.props.recipient && opened) {
      // Recipient override passed in from props
      this.setState({
        recipient: {
          ...initialState.recipient,
          value: recipient,
        },
      })
    } else if (!opened && this.props.opened) {
      // Finished closing the panel, so reset its state
      this.setState({ ...initialState })
    }
  }
  handleAmountChange = event => {
    this.setState({ amount: event.target.value })
  }
  handleRecipientChange = event => {
    this.setState({
      recipient: {
        error: null,
        value: event.target.value,
      },
    })
  }
  handleSubmit = event => {
    event.preventDefault()
    const { amount, recipient } = this.state
    const recipientAddress = recipient.value.trim()
    if (isAddress(recipientAddress)) {
      this.props.onAssignTokens({
        amount: Number(amount),
        recipient: recipientAddress,
      })
    } else {
      this.setState(({ recipient }) => ({
        recipient: {
          ...recipient,
          error: true,
        },
      }))
    }
  }
  render() {
    const { amount, recipient } = this.state
    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <Field label="Recipient (must be a valid Ethereum address)">
            <TextInput
              innerRef={recipient => (this.recipientInput = recipient)}
              value={recipient.value}
              onChange={this.handleRecipientChange}
              pattern={
                // Allow spaces to be trimmable
                ` *${addressPattern} *`
              }
              required
              wide
            />
          </Field>
          <Field label="Number of tokens">
            <TextInput.Number
              value={amount}
              onChange={this.handleAmountChange}
              min={0}
              step="any"
              required
              wide
            />
          </Field>
          <Button mode="strong" type="submit" wide>
            Assign Tokens
          </Button>
          {recipient.error && (
            <ValidationError message="Recipient must be a valid Ethereum address" />
          )}
        </form>
      </div>
    )
  }
}

const ValidationError = ({ message }) => (
  <ValidationErrorBlock>
    <IconCross />
    <Text size="small" style={{ marginLeft: '10px' }}>
      Recipient must be a valid Ethereum address
    </Text>
  </ValidationErrorBlock>
)

const ValidationErrorBlock = styled.p`
  margin-top: 15px;
`

export default AssignVotePanelContent
