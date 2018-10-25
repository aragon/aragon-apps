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
import { toDecimals } from '../../lib/math-utils'
import { addressPattern, isAddress } from '../../lib/web3-utils'

const NO_ERROR = Symbol('NO_ERROR')
const RECEIPIENT_NOT_ADDRESS_ERROR = Symbol('RECEIPIENT_NOT_ADDRESS_ERROR')
const BALANCE_NOT_ENOUGH_ERROR = Symbol('BALANCE_NOT_ENOUGH_ERROR')
const DECIMALS_TOO_MANY_ERROR = Symbol('DECIMALS_TOO_MANY_ERROR')

const initialState = {
  amount: {
    error: NO_ERROR,
    value: '',
  },
  recipient: {
    error: NO_ERROR,
    value: '',
  },
  reference: '',
  selectedToken: 0,
}

class Withdrawal extends React.Component {
  static defaultProps = {
    onWithdraw: () => {},
  }
  state = {
    ...initialState,
  }
  handleAmountUpdate = event => {
    this.setState({
      amount: {
        error: NO_ERROR,
        value: event.target.value,
      },
    })
  }
  handleSelectToken = index => {
    this.setState({ selectedToken: index })
  }
  handleRecipientUpdate = event => {
    this.setState({
      recipient: {
        error: NO_ERROR,
        value: event.target.value,
      },
    })
  }
  handleReferenceUpdate = event => {
    this.setState({ reference: event.target.value })
  }
  handleSubmit = event => {
    event.preventDefault()
    const { onWithdraw, tokens } = this.props
    const { amount, recipient, reference, selectedToken } = this.state

    const token = tokens[selectedToken]
    const recipientAddress = recipient.value.trim()
    // Adjust but without truncation in case the user entered a value with more
    // decimals than possible
    const adjustedAmount = toDecimals(amount.value, token.decimals, {
      truncate: false,
    })
    const amountTooBig = Number(adjustedAmount) > token.amount

    if (!isAddress(recipientAddress)) {
      this.setState(({ recipient }) => ({
        recipient: {
          ...recipient,
          error: RECEIPIENT_NOT_ADDRESS_ERROR,
        },
      }))
    } else if (amountTooBig || adjustedAmount.indexOf('.') !== -1) {
      this.setState(({ amount }) => ({
        amount: {
          ...amount,
          error: amountTooBig
            ? BALANCE_NOT_ENOUGH_ERROR
            : DECIMALS_TOO_MANY_ERROR,
        },
      }))
    } else {
      onWithdraw(token.address, recipientAddress, adjustedAmount, reference)
    }
  }

  render() {
    const { onClose, title, tokens } = this.props
    const { amount, recipient, reference, selectedToken } = this.state

    const nonZeroTokens = tokens.filter(({ amount }) => amount > 0)
    const symbols = nonZeroTokens.map(({ symbol }) => symbol)

    let errorMessage
    if (recipient.error === RECEIPIENT_NOT_ADDRESS_ERROR) {
      errorMessage = 'Recipient must be a valid Ethereum address'
    } else if (amount.error === BALANCE_NOT_ENOUGH_ERROR) {
      errorMessage = 'Amount is greater than balance held by vault'
    } else if (amount.error === DECIMALS_TOO_MANY_ERROR) {
      errorMessage = 'Amount contains too many decimal places'
    }

    return nonZeroTokens.length ? (
      <form onSubmit={this.handleSubmit}>
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
              value={amount.value}
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
            Submit withdrawal
          </Button>
        </ButtonWrapper>
        {errorMessage && <ValidationError message={errorMessage} />}
      </form>
    ) : (
      <div>
        <Info.Permissions title="Action impossible">
          The organization doesn’t have any tokens available to withdraw.
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
      {message}
    </Text>
  </ValidationErrorBlock>
)

const ValidationErrorBlock = styled.p`
  margin-top: 15px;
`

export default Withdrawal
