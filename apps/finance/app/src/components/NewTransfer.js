import React from 'react'
import styled from 'styled-components'
import { Field, TextInput, Text, Button, DropDown, theme } from '@aragon/ui'

class NewTransfer extends React.Component {
  state = {
    selectedToken: 0,
    recipient: '',
    amount: -1,
  }
  handleSelectToken = index => {
    this.setState({ selectedToken: index })
  }
  handleRecipientUpdate = event => {
    this.setState({ recipient: event.target.value })
  }
  handleAmountUpdate = event => {
    const value = event.target.value
    const amount = value === '' ? 0 : parseInt(value, 10)
    this.setState({
      amount: !Number.isInteger(amount) || amount < 0 ? -1 : amount,
    })
  }
  render() {
    const { title, tokens } = this.props
    const { recipient, amount, selectedToken } = this.state
    return (
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
              items={tokens}
              active={selectedToken}
              onChange={this.handleSelectToken}
            />
          </CombinedInput>
        </AmountField>
        <ButtonWrapper>
          <Button mode="strong" wide>
            Submit Transfer
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
