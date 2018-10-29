import React from 'react'
import styled from 'styled-components'
import {
  Button,
  DropDown,
  Field,
  IconCross,
  IdentityBadge,
  Info,
  Text,
  TextInput,
  theme,
} from '@aragon/ui'
import QRCode from 'qrcode.react'
import ToggleContent from '../ToggleContent'
import { toDecimals } from '../../lib/math-utils'
import { addressPattern, isAddress } from '../../lib/web3-utils'

const NO_ERROR = Symbol('NO_ERROR')
const BALANCE_NOT_ENOUGH_ERROR = Symbol('BALANCE_NOT_ENOUGH_ERROR')
const DECIMALS_TOO_MANY_ERROR = Symbol('DECIMALS_TOO_MANY_ERROR')

const initialState = {
  amount: {
    error: NO_ERROR,
    value: '',
  },
  reference: '',
  selectedToken: 0,
}

class Deposit extends React.Component {
  static defaultProps = {
    onDeposit: () => {},
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
  handleReferenceUpdate = event => {
    this.setState({ reference: event.target.value })
  }
  handleSubmit = event => {
    event.preventDefault()
    const { onDeposit, tokens } = this.props
    const { amount, reference, selectedToken } = this.state
    const token = tokens[selectedToken]

    // Adjust but without truncation in case the user entered a value with more
    // decimals than possible
    const adjustedAmount = toDecimals(amount.value, token.decimals, {
      truncate: false,
    })

    if (adjustedAmount.indexOf('.') !== -1) {
      this.setState(({ amount }) => ({
        amount: { ...amount, error: DECIMALS_TOO_MANY_ERROR },
      }))
      return
    }

    onDeposit(token.address, adjustedAmount, reference)
  }

  render() {
    const { title, tokens, proxyAddress } = this.props
    const { amount, reference, selectedToken } = this.state
    const symbols = tokens.map(({ symbol }) => symbol)

    let errorMessage
    if (amount.error === BALANCE_NOT_ENOUGH_ERROR) {
      errorMessage = 'Amount is greater than balance held by vault'
    } else if (amount.error === DECIMALS_TOO_MANY_ERROR) {
      errorMessage = 'Amount contains too many decimal places'
    }

    return (
      <form onSubmit={this.handleSubmit}>
        <h1>{title}</h1>
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
        <Field label="Reference (optional)">
          <TextInput
            onChange={this.handleReferenceUpdate}
            value={reference}
            wide
          />
        </Field>
        <ButtonWrapper>
          <Button mode="strong" type="submit" wide>
            Submit deposit
          </Button>
        </ButtonWrapper>
        {errorMessage && <ValidationError message={errorMessage} />}

        <VSpace size={6} />
        <Info.Action title="Depositing funds to your organization">
          <p>
            Remember, Mainnet organizations use real (not test) funds. Learn
            more about the risks and what's been done to mitigate them here.
          </p>
          <VSpace size={2} />
          <p>
            Configure your deposit above, and sign the transaction with your
            wallet after clicking “Submit Transfer”. It will then show up in
            your Finance app once processed.
          </p>
        </Info.Action>

        {proxyAddress && (
          <div>
            <VSpace size={6} />
            <ToggleContent label="Show address for direct ETH transfer ">
              <VSpace size={4} />
              <QRCode
                value={proxyAddress}
                style={{ width: '80px', height: '80px' }}
              />
              <VSpace size={4} />
              <IdentityBadge
                entity={proxyAddress}
                shorten={false}
                fontSize="small"
              />
              <VSpace size={4} />
              <Info>
                Use the above address or QR code to transfer ETH directly to
                your organization’s Finance app. Note that ERC-20 tokens cannot
                be transferred with the QR code.
              </Info>
            </ToggleContent>
          </div>
        )}
      </form>
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

const VSpace = styled.div`
  height: ${p => (p.size || 1) * 5}px;
`

const ValidationError = ({ message }) => (
  <div>
    <VSpace size={3} />
    <p>
      <IconCross />
      <Text size="small" style={{ marginLeft: '10px' }}>
        {message}
      </Text>
    </p>
  </div>
)

export default Deposit
