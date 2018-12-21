import React from 'react'
import styled from 'styled-components'
import BN from 'bn.js'
import {
  Button,
  Field,
  IconCross,
  IdentityBadge,
  Info,
  SafeLink,
  Text,
  TextInput,
  theme,
} from '@aragon/ui'
import QRCode from 'qrcode.react'
import tokenBalanceOfAbi from '../../abi/token-balanceof.json'
import tokenDecimalsAbi from '../../abi/token-decimals.json'
import tokenSymbolAbi from '../../abi/token-symbol.json'
import { fromDecimals, toDecimals } from '../../lib/math-utils'
import provideNetwork from '../../lib/provideNetwork'
import {
  ETHER_TOKEN_FAKE_ADDRESS,
  tokenDataFallback,
} from '../../lib/token-utils'
import { addressesEqual, isAddress } from '../../lib/web3-utils'
import { combineLatest } from '../../rxjs'
import ToggleContent from '../ToggleContent'
import TokenBadge from './TokenBadge'
import TokenSelector from './TokenSelector'

const NO_ERROR = Symbol('NO_ERROR')
const BALANCE_NOT_ENOUGH_ERROR = Symbol('BALANCE_NOT_ENOUGH_ERROR')
const DECIMALS_TOO_MANY_ERROR = Symbol('DECIMALS_TOO_MANY_ERROR')
const TOKEN_NOT_FOUND_ERROR = Symbol('TOKEN_NOT_FOUND_ERROR')

const MAINNET_RISKS_BLOG_POST =
  'https://blog.aragon.org/aragon-06-is-live-on-mainnet'
const TOKEN_ALLOWANCE_WEBSITE = 'https://tokenallowance.io/'

const tokenAbi = [].concat(tokenBalanceOfAbi, tokenDecimalsAbi, tokenSymbolAbi)

const initialState = {
  amount: {
    error: NO_ERROR,
    value: '',
  },
  reference: '',
  selectedToken: {
    coerced: false, // whether the token was coerced from a symbol to an address
    data: {
      loading: false,
    },
    error: NO_ERROR,
    index: 0,
    value: '',
  },
}

class Deposit extends React.Component {
  static defaultProps = {
    onDeposit: () => {},
  }
  state = {
    ...initialState,
  }
  handleAmountUpdate = event => {
    this.validateInputs({
      amount: {
        value: event.target.value,
      },
    })
  }
  handleSelectToken = ({ address, index, value }) => {
    const tokenIsAddress = isAddress(address)
    const selectedToken = {
      index,
      coerced: tokenIsAddress && address !== value,
      value: address,
      data: { loading: true },
    }

    if (!tokenIsAddress) {
      this.validateInputs({ selectedToken })
      return
    }

    // Set the initial loading state before we go async
    this.setState({ selectedToken }, async () => {
      const tokenData = await this.loadTokenData(address)

      // Make sure we still want the information about this token after the async call,
      // in case the token was changed before this finished loading
      if (this.state.selectedToken.value === address) {
        this.validateInputs({
          selectedToken: {
            ...this.state.selectedToken,
            data: {
              ...tokenData,
              loading: false,
            },
          },
        })
      }
    })
  }
  handleReferenceUpdate = event => {
    this.setState({ reference: event.target.value })
  }
  handleSubmit = event => {
    event.preventDefault()
    const { onDeposit } = this.props
    const { amount, reference, selectedToken } = this.state

    if (this.validateInputs()) {
      const adjustedAmount = toDecimals(
        amount.value,
        selectedToken.data.decimals
      )
      onDeposit(selectedToken.value, adjustedAmount, reference)
    }
  }
  canSubmit() {
    const { selectedToken } = this.state
    return selectedToken.value && !selectedToken.data.loading
  }
  loadTokenData(address) {
    const { app, network, userAccount } = this.props

    // ETH
    if (addressesEqual(address, ETHER_TOKEN_FAKE_ADDRESS)) {
      return new Promise((resolve, reject) =>
        app
          .web3Eth('getBalance', userAccount)
          .first()
          .subscribe(
            ethBalance =>
              resolve({
                decimals: 18,
                loading: false,
                symbol: 'ETH',
                userBalance: ethBalance,
              }),
            reject
          )
      )
    }

    // Tokens
    const token = app.external(address, tokenAbi)

    return new Promise(async (resolve, reject) => {
      const userBalance = await token
        .balanceOf(userAccount)
        .first()
        .toPromise()

      const decimalsFallback =
        tokenDataFallback(address, 'decimals', network.type) || '0'
      const symbolFallback =
        tokenDataFallback(address, 'symbol', network.type) || ''

      combineLatest(token.decimals(), token.symbol())
        .first()
        .subscribe(
          ([decimals = decimalsFallback, symbol = symbolFallback]) =>
            resolve({
              symbol,
              userBalance,
              decimals: parseInt(decimals, 10),
              loading: false,
            }),
          () => {
            // Decimals and symbols are optional
            resolve({
              userBalance,
              decimals: parseInt(decimalsFallback, 10),
              loading: false,
              symbol: symbolFallback,
            })
          }
        )
    })
  }
  validateInputs({ amount, selectedToken } = {}) {
    amount = amount || this.state.amount
    selectedToken = selectedToken || this.state.selectedToken

    if (selectedToken.value && !isAddress(selectedToken.value)) {
      this.setState(({ amount }) => ({
        amount: { ...amount },
        selectedToken: { ...selectedToken, error: TOKEN_NOT_FOUND_ERROR },
      }))
      return false
    }

    if (amount.value && selectedToken.data.decimals) {
      // Adjust but without truncation in case the user entered a value with more
      // decimals than possible
      const adjustedAmount = toDecimals(
        amount.value,
        selectedToken.data.decimals,
        {
          truncate: false,
        }
      )

      if (adjustedAmount.indexOf('.') !== -1) {
        this.setState(({ amount }) => ({
          amount: { ...amount, error: DECIMALS_TOO_MANY_ERROR },
          selectedToken: { ...selectedToken },
        }))
        return false
      }

      if (
        selectedToken.data.userBalance &&
        new BN(adjustedAmount).gt(new BN(selectedToken.data.userBalance))
      ) {
        this.setState({
          amount: { ...amount, error: BALANCE_NOT_ENOUGH_ERROR },
          selectedToken: { ...selectedToken },
        })
        return false
      }
    }

    // No errors! Set the new state with no errors!
    this.setState({
      amount: {
        ...amount,
        error: NO_ERROR,
      },
      selectedToken: {
        ...selectedToken,
        error: NO_ERROR,
      },
    })
    return true
  }

  render() {
    const { network, title, tokens, proxyAddress } = this.props
    const { amount, reference, selectedToken } = this.state

    let errorMessage
    if (selectedToken.error === TOKEN_NOT_FOUND_ERROR) {
      errorMessage = 'Token not found'
    } else if (amount.error === BALANCE_NOT_ENOUGH_ERROR) {
      errorMessage = 'Amount is greater than balance held'
    } else if (amount.error === DECIMALS_TOO_MANY_ERROR) {
      errorMessage = 'Amount contains too many decimal places'
    }
    const disabled = errorMessage || !this.canSubmit()

    const selectedTokenIsAddress = isAddress(selectedToken.value)
    const showTokenBadge = selectedTokenIsAddress && selectedToken.coerced
    const tokenBalanceMessage = selectedToken.data.userBalance
      ? `You have ${fromDecimals(
          selectedToken.data.userBalance,
          selectedToken.data.decimals
        )} ${selectedToken.data.symbol} available`
      : ''

    const ethSelected =
      selectedTokenIsAddress &&
      addressesEqual(selectedToken.value, ETHER_TOKEN_FAKE_ADDRESS)
    const tokenSelected = selectedToken.value && !ethSelected
    const isMainnet = network.type === 'main'

    return (
      <form onSubmit={this.handleSubmit}>
        <h1>{title}</h1>
        <TokenSelector
          activeIndex={selectedToken.index}
          onChange={this.handleSelectToken}
          tokens={tokens}
        />
        {showTokenBadge && (
          <TokenBadge
            address={selectedToken.value}
            symbol={selectedToken.data.symbol}
          />
        )}
        <TokenBalance>
          <Text size="small" color={theme.textSecondary}>
            {tokenBalanceMessage}
          </Text>
        </TokenBalance>
        <Field label="Amount">
          <TextInput.Number
            value={amount.value}
            onChange={this.handleAmountUpdate}
            min={0}
            step="any"
            required
            wide
          />
        </Field>
        <Field label="Reference (optional)">
          <TextInput
            onChange={this.handleReferenceUpdate}
            value={reference}
            wide
          />
        </Field>
        <ButtonWrapper>
          <Button wide mode="strong" type="submit" disabled={disabled}>
            Submit deposit
          </Button>
        </ButtonWrapper>
        {errorMessage && <ValidationError message={errorMessage} />}

        <VSpace size={6} />
        <Info.Action title="Depositing funds to your organization">
          {isMainnet && (
            <React.Fragment>
              <p>
                Remember, Mainnet organizations use real (not test) funds.{' '}
                <StyledSafeLink href={MAINNET_RISKS_BLOG_POST} target="_blank">
                  Learn more
                </StyledSafeLink>{' '}
                about the risks and what's been done to mitigate them here.
              </p>
              <VSpace size={2} />
            </React.Fragment>
          )}
          <p>
            Configure your deposit above, and sign the transaction with your
            wallet after clicking “Submit Transfer”. It will then show up in
            your Finance app once processed.
          </p>
          {tokenSelected && (
            <React.Fragment>
              <VSpace size={2} />
              <p>
                Tokens may require a pretransaction to approve the Finance app
                for your deposit.{' '}
                <StyledSafeLink href={TOKEN_ALLOWANCE_WEBSITE} target="_blank">
                  Find out why.
                </StyledSafeLink>{' '}
              </p>
            </React.Fragment>
          )}
        </Info.Action>

        {proxyAddress &&
          ethSelected && (
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
                  fontSize="small"
                  networkType={network.type}
                  shorten={false}
                />
                <VSpace size={2} />
                <Info>
                  Use the above address or QR code to transfer ETH directly to
                  your organization’s Finance app. You should specify a gas limit
                  of 350,000 for this transfer.
                  <Text.Paragraph size="xsmall" style={{ marginTop: '10px' }}>
                    <strong>WARNING</strong>: Do <strong>not</strong> send non-ETH
                    (e.g. ERC-20) tokens directly to this address.
                  </Text.Paragraph>
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

const TokenBalance = styled.div`
  margin: 10px 0 20px;
`

const StyledSafeLink = styled(SafeLink)`
  text-decoration-color: ${theme.accent};
  color: ${theme.accent};
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

export default provideNetwork(Deposit)
