import React, { useLayoutEffect, useState } from 'react'
import styled from 'styled-components'
import {
  Button,
  DropDown,
  IconCross,
  Info,
  Field,
  TextInput,
  GU,
  textStyle,
  useTheme,
} from '@aragon/ui'
import LocalIdentitiesAutoComplete from '../LocalIdentitiesAutoComplete/LocalIdentitiesAutoComplete'
import { toDecimals, fromDecimals } from '../../lib/math-utils'
import { addressPattern, isAddress } from '../../lib/web3-utils'
import AmountInput from '../AmountInput'

const NO_ERROR = Symbol('NO_ERROR')
const RECEIPIENT_NOT_ADDRESS_ERROR = Symbol('RECEIPIENT_NOT_ADDRESS_ERROR')
const BALANCE_NOT_ENOUGH_ERROR = Symbol('BALANCE_NOT_ENOUGH_ERROR')
const DECIMALS_TOO_MANY_ERROR = Symbol('DECIMALS_TOO_MANY_ERROR')

const NULL_SELECTED_TOKEN = -1

class Withdrawal extends React.Component {
  static defaultProps = {
    tokens: [],
    onWithdraw: () => {},
  }
  state = {
    amount: {
      error: NO_ERROR,
      value: '',
    },
    recipient: {
      error: NO_ERROR,
      value: '',
    },
    reference: '',
    selectedToken: NULL_SELECTED_TOKEN,
  }
  _recipientInput = React.createRef()
  componentDidUpdate(prevProps) {
    const { readyToFocus } = this.props
    const input = this._recipientInput.current
    if (readyToFocus && !prevProps.readyToFocus && input) {
      input.focus()
    }
  }
  nonZeroTokens() {
    return this.props.tokens.filter(({ amount }) => !amount.isZero())
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
  handleRecipientUpdate = value => {
    this.setState({
      recipient: {
        error: NO_ERROR,
        value,
      },
    })
  }
  handleReferenceUpdate = event => {
    this.setState({ reference: event.target.value })
  }
  handleSubmit = event => {
    event.preventDefault()
    const { onWithdraw } = this.props
    const { amount, recipient, reference, selectedToken } = this.state

    const tokens = this.nonZeroTokens()
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
      return
    }

    if (amountTooBig || adjustedAmount.indexOf('.') !== -1) {
      this.setState(({ amount }) => ({
        amount: {
          ...amount,
          error: amountTooBig
            ? BALANCE_NOT_ENOUGH_ERROR
            : DECIMALS_TOO_MANY_ERROR,
        },
      }))
      return
    }

    onWithdraw(token.address, recipientAddress, adjustedAmount, reference)
  }

  setMaxUserBalance = () => {
    const { selectedToken, amount } = this.state
    const token = this.nonZeroTokens()[selectedToken]
    const adjustedAmount = fromDecimals(token.amount.toString(), token.decimals)
    this.setState({
      amount: { ...amount, value: adjustedAmount },
    })
  }

  render() {
    const { title } = this.props
    const { amount, recipient, reference, selectedToken } = this.state

    const tokens = this.nonZeroTokens()
    const symbols = tokens.map(({ symbol }) => symbol)

    let errorMessage
    if (recipient.error === RECEIPIENT_NOT_ADDRESS_ERROR) {
      errorMessage = 'Recipient must be a valid Ethereum address'
    } else if (amount.error === BALANCE_NOT_ENOUGH_ERROR) {
      errorMessage = 'Amount is greater than balance available'
    } else if (amount.error === DECIMALS_TOO_MANY_ERROR) {
      errorMessage = 'Amount contains too many decimal places'
    }

    const disabled = Boolean(
      errorMessage ||
        !recipient.value ||
        !amount.value ||
        selectedToken === NULL_SELECTED_TOKEN
    )

    const isVisibleMaxButton = Boolean(selectedToken !== NULL_SELECTED_TOKEN)

    return tokens.length ? (
      <form onSubmit={this.handleSubmit}>
        <h1>{title}</h1>
        <Field
          label="Recipient (must be a valid Ethereum address)"
          css="height: 60px"
        >
          <LocalIdentitiesAutoComplete
            ref={this._recipientInput}
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
        <Field label="Amount" required>
          <CombinedInput>
            <AmountInput
              onChange={this.handleAmountUpdate}
              onMaxClick={this.setMaxUserBalance}
              showMax={isVisibleMaxButton}
              value={amount.value}
              required
              wide
            />

            <DropDown
              header="Token"
              placeholder="Token"
              items={symbols}
              selected={selectedToken}
              onChange={this.handleSelectToken}
              css={`
                margin-left: ${1.5 * GU}px;
              `}
            />
          </CombinedInput>
        </Field>
        <Field label="Reference (optional)">
          <TextInput
            onChange={this.handleReferenceUpdate}
            value={reference}
            wide
          />
        </Field>
        <Button disabled={disabled} mode="strong" type="submit" wide>
          Submit withdrawal
        </Button>
        {errorMessage && <ValidationError message={errorMessage} />}
      </form>
    ) : (
      <Info mode="warning">
        The organization doesn’t have any tokens available to withdraw.
      </Info>
    )
  }
}

const CombinedInput = styled.div`
  display: flex;
`

const ValidationError = ({ message }) => {
  const theme = useTheme()
  return (
    <div
      css={`
        display: flex;
        align-items: center;
        margin-top: ${2 * GU}px;
      `}
    >
      <IconCross
        size="tiny"
        css={`
          color: ${theme.negative};
          margin-right: ${1 * GU}px;
        `}
      />
      <span
        css={`
          ${textStyle('body3')}
        `}
      >
        {message}
      </span>
    </div>
  )
}

export default props => {
  const [readyToFocus, setReadyToFocus] = useState(false)
  useLayoutEffect(() => {
    setReadyToFocus(true)
  }, [])
  return <Withdrawal readyToFocus={readyToFocus} {...props} />
}
