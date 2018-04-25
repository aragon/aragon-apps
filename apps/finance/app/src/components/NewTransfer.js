import React from 'react'
import styled from 'styled-components'
import {
  Button,
  DropDown,
  IconCross,
  Info,
  Field,
  Text,
  TextInput,
  theme,
} from '@aragon/ui'
import { addressPattern, isAddress } from '../web3-utils'

const initialState = {
  selectedToken: 0,
  recipient: {
    error: null,
    value: '',
  },
  reference: '',
  amount: '',
}

class NewTransfer extends React.Component {
  static defaultProps = {
    onTransfer: () => {},
  }
  state = {
    ...initialState,
  }
  componentWillReceiveProps({ opened }) {
    if (opened && !this.props.opened) {
      // setTimeout is needed as a small hack to wait until the input's on
      // screen until we call focus
      this.recipientInput && setTimeout(() => this.recipientInput.focus(), 0)
    } else if (!opened && this.props.opened) {
      // Finished closing the panel, so reset its state
      this.setState({ ...initialState })
    }
  }
  handleSelectToken = index => {
    this.setState({ selectedToken: index })
  }
  handleRecipientUpdate = event => {
    this.setState({
      recipient: {
        error: null,
        value: event.target.value,
      },
    })
  }
  handleReferenceUpdate = event => {
    this.setState({ reference: event.target.value })
  }
  handleAmountUpdate = event => {
    this.setState({ amount: event.target.value })
  }
  handleTransfer = event => {
    event.preventDefault()
    const { onTransfer, tokens } = this.props
    const { amount, recipient, reference, selectedToken } = this.state
    const recipientAddress = recipient.value.trim()
    if (isAddress(recipientAddress)) {
      onTransfer(
        tokens[selectedToken],
        recipientAddress,
        Number(amount),
        reference
      )
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
    const { onClose, title, tokens } = this.props
    const { amount, recipient, reference, selectedToken } = this.state
    const symbols = tokens.map(({ symbol }) => symbol)
    return tokens.length ? (
      <form onSubmit={this.handleTransfer}>
        <h1>{title}</h1>
        <Field label="Recipient (must be a valid Ethereum address)">
          <TextInput
            innerRef={recipient => (this.recipientInput = recipient)}
            onChange={this.handleRecipientUpdate}
            pattern={
              // Allow spaces to be trimmable
              ` *${addressPattern} *`
            }
            value={recipient.value}
            required
            wide
          />
        </Field>
        <AmountField>
          <label>
            <Text.Block color={theme.textSecondary} smallcaps>
              Amount
            </Text.Block>
          </label>
          <CombinedInput>
            <TextInput.Number
              value={amount}
              onChange={this.handleAmountUpdate}
              min={0}
              step="any"
              required
              wide
            />
            <DropDown
              items={symbols}
              active={selectedToken}
              onChange={this.handleSelectToken}
            />
          </CombinedInput>
        </AmountField>
        <Field label="Reference">
          <TextInput
            onChange={this.handleReferenceUpdate}
            value={reference}
            wide
          />
        </Field>
        <ButtonWrapper>
          <Button mode="strong" type="submit" wide>
            Submit Transfer
          </Button>
        </ButtonWrapper>
        {recipient.error && (
          <ValidationError message="Recipient must be a valid Ethereum address" />
        )}
      </form>
    ) : (
      <div>
        <Info.Permissions title="Action impossible">
          You cannot create any payments. The DAO does not have any tokens
          available to transfer.
        </Info.Permissions>
        <ButtonWrapper>
          <Button mode="strong" wide onClick={onClose}>
            Close
          </Button>
        </ButtonWrapper>
      </div>
    )
  }
}

const ButtonWrapper = styled.div`
  padding-top: 10px;
`

const AmountField = styled.div`
  margin-bottom: 20px;
`

const CombinedInput = styled.div`
  display: flex;
  input[type='text'] {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 0;
  }
  input[type='text'] + div > div:first-child {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }
`

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

export default NewTransfer
