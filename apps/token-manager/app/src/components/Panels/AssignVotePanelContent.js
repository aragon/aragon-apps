import React from 'react'
import styled from 'styled-components'
import { Button, Field, IconCross, Text, TextInput } from '@aragon/ui'
import { addressPattern, isAddress } from '../../web3-utils'
import { fromDecimals, toDecimals, formatBalance } from '../../utils'

// Any more and the number input field starts to put numbers in scientific notation
const MAX_INPUT_DECIMAL_BASE = 6

const initialState = {
  mode: 'assign',
  holderField: {
    error: false,
    value: '',
  },
  amountField: {
    error: false,
    value: '',
    max: '',
  },
}

class AssignVotePanelContent extends React.Component {
  static defaultProps = {
    onUpdateTokens: () => {},
  }
  state = {
    ...initialState,
  }
  componentWillReceiveProps({ opened, mode, holderAddress }) {
    if (opened && !this.props.opened) {
      // setTimeout is needed as a small hack to wait until the input is
      // on-screen before we call focus
      this.holderInput && setTimeout(() => this.holderInput.focus(), 0)

      // Upadte holder address from the props
      this.updateHolderAddress(mode, holderAddress)
    }

    // Finished closing the panel, its state can be reset
    if (!opened && this.props.opened) {
      this.setState({ ...initialState })
    }
  }
  filteredHolderAddress() {
    const { holderField } = this.state
    return holderField.value.trim()
  }
  filteredAmount() {
    const { tokenDecimals } = this.props
    const { amountField } = this.state
    return toDecimals(amountField.value.trim(), tokenDecimals)
  }
  updateHolderAddress(mode, value) {
    const {
      maxAccountTokens,
      tokenDecimalsBase,
      tokenDecimals,
      getHolderBalance,
    } = this.props

    const holderBalance = getHolderBalance(value.trim())

    this.setState(({ holderField, amountField }) => ({
      holderField: {
        ...holderField,
        value,
        error: false,
      },
      amountField: {
        ...amountField,
        max: formatBalance(
          mode === 'assign'
            ? maxAccountTokens.sub(holderBalance)
            : holderBalance,
          tokenDecimalsBase,
          tokenDecimals
        ),
      },
    }))
  }
  handleAmountChange = event => {
    const { amountField } = this.state
    this.setState({
      amountField: { ...amountField, value: event.target.value },
    })
  }
  handleHolderChange = event => {
    this.updateHolderAddress(this.props.mode, event.target.value)
  }
  handleSubmit = event => {
    event.preventDefault()
    const { mode } = this.props
    const holderAddress = this.filteredHolderAddress()
    if (isAddress(holderAddress)) {
      this.props.onUpdateTokens({
        mode,
        amount: this.filteredAmount(),
        holder: holderAddress,
      })
    } else {
      this.setState(({ holderField }) => ({
        holderField: { ...holderField, error: true },
      }))
    }
  }
  render() {
    const { holderField, amountField } = this.state
    const { mode, tokenDecimals } = this.props

    const minTokenStep = fromDecimals(
      '1',
      Math.min(MAX_INPUT_DECIMAL_BASE, tokenDecimals)
    )

    return (
      <div>
        <form onSubmit={this.handleSubmit}>
          <Field
            label={`
              ${mode === 'assign' ? 'Recipient' : 'Account'}
              (must be a valid Ethereum address)
            `}
          >
            <TextInput
              innerRef={element => (this.holderInput = element)}
              value={holderField.value}
              onChange={this.handleHolderChange}
              pattern={
                // Allow spaces to be trimmable
                ` *${addressPattern} *`
              }
              required
              wide
            />
          </Field>

          <Field
            label={`
              Number of tokens to ${mode === 'assign' ? 'assign' : 'remove'}
            `}
          >
            <TextInput.Number
              value={amountField.value}
              onChange={this.handleAmountChange}
              min={minTokenStep}
              {...(amountField.max === '-1' ? {} : { max: amountField.max })}
              {...(amountField.max === '0' ? { disabled: true } : {})}
              step={minTokenStep}
              required
              wide
            />
          </Field>
          <Button mode="strong" type="submit" wide>
            {mode === 'assign' ? 'Assign' : 'Remove'} Tokens
          </Button>
          {holderField.error && (
            <ValidationError
              message={`
                ${mode === 'assign' ? 'Recipient' : 'Account'}
                must be a valid Ethereum address
              `}
            />
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
      {message}
    </Text>
  </ValidationErrorBlock>
)

const ValidationErrorBlock = styled.p`
  margin-top: 15px;
`

export default AssignVotePanelContent
