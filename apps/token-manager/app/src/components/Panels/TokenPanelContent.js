import React from 'react'
import styled from 'styled-components'
import {
  Button,
  Field,
  IconCross,
  Info,
  TextInput,
  GU,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { isAddress } from '../../web3-utils'
import { fromDecimals, toDecimals, formatBalance } from '../../utils'
import LocalIdentitiesAutoComplete from '../LocalIdentitiesAutoComplete/LocalIdentitiesAutoComplete'

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

class TokenPanelContent extends React.Component {
  static defaultProps = {
    onUpdateTokens: () => {},
  }
  state = {
    ...initialState,
  }
  _holderInput = React.createRef()
  componentWillReceiveProps({ opened, mode, holderAddress }) {
    if (opened && !this.props.opened) {
      // setTimeout is needed as a small hack to wait until the input is
      // on-screen before we call focus
      this._holderInput.current &&
        setTimeout(
          () => this._holderInput.current && this._holderInput.current.focus(),
          0
        )

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
              reached
            `
            : `
              This account doesn’t have any tokens to remove
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
  handleHolderChange = value => {
    this.updateHolderAddress(this.props.mode, value)
  }
  handleSubmit = event => {
    event.preventDefault()
    const { mode } = this.props
    const holderAddress = this.filteredHolderAddress()

    const holderError = !isAddress(holderAddress)
      ? `
        ${mode === 'assign' ? 'Recipient' : 'Account'}
        must be a valid Ethereum address
      `
      : null

    // Error
    if (holderError) {
      this.setState(({ holderField }) => ({
        holderField: { ...holderField, error: holderError },
      }))
      return
    }

    // Update tokens
    this.props.onUpdateTokens({
      mode,
      amount: this.filteredAmount(),
      holder: holderAddress,
    })
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
        <form
          css={`
            margin-top: ${3 * GU}px;
          `}
          onSubmit={this.handleSubmit}
        >
          <InfoMessage
            title="Action"
            text={`This action will ${
              mode === 'assign'
                ? 'mint tokens to the recipient below'
                : 'burn tokens from the account below'
            }.`}
          />
          <Field
            label={`
              ${mode === 'assign' ? 'Recipient' : 'Account'}
              (must be a valid Ethereum address)
            `}
            css="height: 62px"
          >
            <LocalIdentitiesAutoComplete
              ref={this._holderInput}
              value={holderField.value}
              onChange={this.handleHolderChange}
              wide
              required
            />
          </Field>

          <Field label="Number of tokens">
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
            {mode === 'assign' ? 'Add' : 'Remove'} tokens
          </Button>
          <div
            css={`
              margin-top: ${2 * GU}px;
            `}
          >
            {errorMessage && <ErrorMessage message={errorMessage} />}
            {warningMessage && <WarningMessage message={warningMessage} />}
          </div>
        </form>
      </div>
    )
  }
}

const Message = styled.div`
  & + & {
    margin-top: ${2 * GU}px;
  }
`

const InfoMessage = ({ title, text }) => (
  <div
    css={`
      margin-bottom: ${3 * GU}px;
    `}
  >
    <Info title={title}>{text}</Info>
  </div>
)

const WarningMessage = ({ message }) => (
  <Message>
    <Info mode="warning">{message}</Info>
  </Message>
)

const ErrorMessage = ({ message }) => {
  const theme = useTheme()
  return (
    <Message
      css={`
        display: flex;
        align-items: center;
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
    </Message>
  )
}

export default TokenPanelContent
