import React from 'react'
import styled from 'styled-components'
import { Button, Field, IconCross, Text, TextInput, Info } from '@aragon/ui'
import { isAddress } from '../../web3-utils'
import { fromDecimals, toDecimals, formatBalance } from '../../utils'

// Any more and the number input field starts to put numbers in scientific notation
const MAX_INPUT_DECIMAL_BASE = 6

const initialState = {
  mode: 'assign',
  holderField: {
    error: null,
    warning: null,
    value: '',
  },
  amountField: {
    error: null,
    warning: null,
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
    const maxAmount =
      mode === 'assign' ? maxAccountTokens.sub(holderBalance) : holderBalance

    this.setState(({ holderField, amountField }) => ({
      holderField: { ...holderField, value, error: null },
      amountField: {
        ...amountField,
        max: formatBalance(maxAmount, tokenDecimalsBase, tokenDecimals),
        warning:
          maxAmount.isZero() &&
          (mode === 'assign'
            ? `
              The maximum amount of tokens that can be assigned has already been
              reached.
            `
            : `
              This account doesn’t have any tokens to remove.
            `),
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

    const holderError =
      !isAddress(holderAddress) &&
      `
        ${mode === 'assign' ? 'Recipient' : 'Account'}
        must be a valid Ethereum address.
      `

    if (isAddress(holderAddress)) {
      this.props.onUpdateTokens({
        mode,
        amount: this.filteredAmount(),
        holder: holderAddress,
      })
    } else {
      this.setState(({ holderField }) => ({
        holderField: {
          ...holderField,
          error: holderError,
        },
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

    const errorMessage = holderField.error || amountField.error
    const warningMessage = holderField.warning || amountField.warning

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
              wide
            />
          </Field>

          <Field
            label={`
              Tokens to ${mode === 'assign' ? 'assign' : 'remove'}
            `}
          >
            <TextInput.Number
              value={amountField.value}
              onChange={this.handleAmountChange}
              min={minTokenStep}
              max={amountField.max}
              disabled={amountField.max === '0'}
              step={minTokenStep}
              required
              wide
            />
          </Field>
          <Button
            mode="strong"
            type="submit"
            disabled={amountField.max === '0'}
            wide
          >
            {mode === 'assign' ? 'Assign' : 'Remove'} Tokens
          </Button>
          <Messages>
            {errorMessage && <ErrorMessage message={errorMessage} />}
            {warningMessage && <WarningMessage message={warningMessage} />}
          </Messages>
        </form>
      </div>
    )
  }
}

const Messages = styled.div`
  margin-top: 15px;
`

const WarningMessage = ({ message }) => <Info.Action>{message}</Info.Action>

const ErrorMessage = ({ message }) => (
  <p>
    <IconCross />
    <Text size="small" style={{ marginLeft: '10px' }}>
      {message}
    </Text>
  </p>
)

export default AssignVotePanelContent
