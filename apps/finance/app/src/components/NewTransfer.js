import React from 'react'
import styled from 'styled-components'
import {
  Button,
  DropDown,
  Info,
  Field,
  Text,
  TextInput,
  theme,
} from '@aragon/ui'

class NewTransfer extends React.Component {
  static defaultProps = {
    onTransfer: () => {},
  }
  state = {
    selectedToken: 0,
    recipient: '',
    reference: '',
    amount: -1,
  }
  handleSelectToken = index => {
    this.setState({ selectedToken: index })
  }
  handleRecipientUpdate = event => {
    this.setState({ recipient: event.target.value })
  }
  handleReferenceUpdate = event => {
    this.setState({ reference: event.target.value })
  }
  handleAmountUpdate = event => {
    const value = event.target.value
    const amount = value === '' ? 0 : parseInt(value, 10)
    this.setState({
      amount: !Number.isInteger(amount) || amount < 0 ? -1 : amount,
    })
  }
  handleTransfer = () => {
    const { balances, onTransfer } = this.props
    const { amount, recipient, reference, selectedToken } = this.state
    onTransfer(balances[selectedToken], recipient, amount, reference)
  }
  render() {
    const { balances, onClose, title } = this.props
    const { amount, recipient, reference, selectedToken } = this.state
    const paymentPossibleTokens = balances.filter(({ amount }) => amount)
    const symbols = paymentPossibleTokens.map(({ symbol }) => symbol)
    return paymentPossibleTokens.length ? (
      <div>
        <h1>{title}</h1>
        <Field label="Recipient">
          <TextInput
            onChange={this.handleRecipientUpdate}
            value={recipient}
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
            <TextInput
              onChange={this.handleAmountUpdate}
              value={amount === -1 ? '' : amount}
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
          <Button mode="strong" wide onClick={this.handleTransfer}>
            Submit Transfer
          </Button>
        </ButtonWrapper>
      </div>
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

export default NewTransfer
