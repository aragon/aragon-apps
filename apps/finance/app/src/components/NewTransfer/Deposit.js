import React from 'react'
import styled from 'styled-components'
import BN from 'bn.js'
import {
  Button,
  Field,
  IconCross,
  IdentityBadge,
  Info,
  Link,
  TextInput,
  TokenBadge,
  GU,
  textStyle,
  useTheme,
} from '@aragon/ui'
import { useAragonApi } from '@aragon/api-react'
import QRCode from 'qrcode.react'
import tokenBalanceOfAbi from '../../abi/token-balanceof.json'
import tokenDecimalsAbi from '../../abi/token-decimals.json'
import tokenSymbolAbi from '../../abi/token-symbol.json'
import { fromDecimals, toDecimals } from '../../lib/math-utils'
import {
  ETHER_TOKEN_FAKE_ADDRESS,
  tokenDataOverride,
  getTokenSymbol,
} from '../../lib/token-utils'
import { addressesEqual, isAddress } from '../../lib/web3-utils'
import AmountInput from '../AmountInput'
import ToggleContent from '../ToggleContent'
import TokenSelector from './TokenSelector'

const NO_ERROR = Symbol('NO_ERROR')
const BALANCE_NOT_ENOUGH_ERROR = Symbol('BALANCE_NOT_ENOUGH_ERROR')
const DECIMALS_TOO_MANY_ERROR = Symbol('DECIMALS_TOO_MANY_ERROR')
const TOKEN_NOT_FOUND_ERROR = Symbol('TOKEN_NOT_FOUND_ERROR')

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
    index: -1,
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
  componentWillReceiveProps({ opened }) {
    if (!opened && this.props.opened) {
      // Panel closing; reset state
      this.setState({ ...initialState })
    }
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
      this.validateInputs({
        selectedToken: {
          ...selectedToken,
          data: {
            loading: false,
            symbol: value,
          },
        },
      })
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
  async loadTokenData(address) {
    const { api, network, connectedAccount } = this.props

    // ETH
    if (addressesEqual(address, ETHER_TOKEN_FAKE_ADDRESS)) {
      const userBalance = await api
        .web3Eth('getBalance', connectedAccount)
        .toPromise()
        .catch(() => '-1')

      return {
        decimals: network?.nativeCurrency?.decimals || 18,
        loading: false,
        symbol: network?.nativeCurrency?.symbol || 'ETH',
        userBalance,
      }
    }

    // Tokens
    const token = api.external(address, tokenAbi)
    const userBalance = await token
      .balanceOf(connectedAccount)
      .toPromise()
      .catch(() => '-1')

    const fetchSymbol = async () => {
      const override = tokenDataOverride(address, 'symbol', network.type)
      return override || getTokenSymbol(api, address).catch(() => '')
    }
    const fetchDecimals = async () => {
      const override = tokenDataOverride(address, 'decimals', network.type)
      const decimals =
        override ||
        (await token
          .decimals()
          .toPromise()
          .catch(() => '0'))
      return parseInt(decimals, 10)
    }

    const [tokenSymbol, tokenDecimals] = await Promise.all([
      fetchSymbol(),
      fetchDecimals(),
    ])

    return {
      userBalance,
      decimals: tokenDecimals,
      loading: false,
      symbol: tokenSymbol,
    }
  }
  validateInputs({ amount, selectedToken } = {}) {
    if (
      selectedToken &&
      !isAddress(selectedToken.value) &&
      selectedToken.data.symbol
    ) {
      this.setState(({ amount }) => ({
        amount: { ...amount },
        selectedToken: { ...selectedToken, error: TOKEN_NOT_FOUND_ERROR },
      }))
      return false
    }

    amount = amount || this.state.amount
    selectedToken = selectedToken || this.state.selectedToken

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
  setMaxUserBalance = () => {
    const { selectedToken, amount } = this.state
    const { userBalance, decimals } = selectedToken.data
    const adjustedAmount = fromDecimals(userBalance, decimals)
    this.setState({
      amount: { ...amount, value: adjustedAmount },
    })
  }
  render() {
    const { appAddress, network, title, tokens } = this.props
    const { amount, reference, selectedToken } = this.state
    let errorMessage
    if (selectedToken.error === TOKEN_NOT_FOUND_ERROR) {
      errorMessage = 'Token not found'
    } else if (amount.error === BALANCE_NOT_ENOUGH_ERROR) {
      errorMessage = 'Amount is greater than balance held'
    } else if (amount.error === DECIMALS_TOO_MANY_ERROR) {
      errorMessage = 'Amount contains too many decimal places'
    }
    const disabled = !!errorMessage || !this.canSubmit()

    const ethSelected =
      isAddress(selectedToken.value) &&
      addressesEqual(selectedToken.value, ETHER_TOKEN_FAKE_ADDRESS)
    const tokenSelected = selectedToken.value && !ethSelected
    const isMainnet = network.type === 'main'
    const isMaxButtonVisible = selectedToken && selectedToken.data.symbol

    const selectedTokenSymbol  = selectedToken?.data?.symbol || 'ETH'

    return (
      <form onSubmit={this.handleSubmit}>
        <h1>{title}</h1>
        <TokenSelector
          onChange={this.handleSelectToken}
          selectedIndex={selectedToken.index}
          tokens={tokens}
        />
        <SelectedTokenBalance network={network} selectedToken={selectedToken} />
        <Field label="Amount">
          <AmountInput
            onChange={this.handleAmountUpdate}
            onMaxClick={this.setMaxUserBalance}
            showMax={isMaxButtonVisible}
            value={amount.value}
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
        <Button wide mode="strong" type="submit" disabled={disabled}>
          Submit deposit
        </Button>
        {errorMessage && <ValidationError message={errorMessage} />}

        <VSpace size={3} />
        <Info>
          {isMainnet && (
            <p>
              Remember, Mainnet organizations use <strong>real funds</strong>.
            </p>
          )}
          <p>
            Configure your deposit above, and sign the transaction with your
            wallet after clicking “Submit Transfer”. It will then show up in
            your Finance app once processed.
          </p>
          {tokenSelected && (
            <React.Fragment>
              <p
                css={`
                  margin-top: ${1 * GU}px;
                `}
              >
                Tokens may require a pretransaction to approve the Finance app
                for your deposit.{' '}
                <Link href={TOKEN_ALLOWANCE_WEBSITE} target="_blank">
                  Find out why.
                </Link>{' '}
              </p>
            </React.Fragment>
          )}
        </Info>

        {appAddress && ethSelected && (
          <div>
            <VSpace size={3} />
            <ToggleContent label={`Show address for direct ${selectedTokenSymbol} transfer `}>
              <VSpace size={2} />
              <QRCode
                value={appAddress}
                style={{ width: '80px', height: '80px' }}
              />
              <VSpace size={1} />
              <IdentityBadge
                entity={appAddress}
                labelStyle={`
                  ${textStyle('body3')}
                `}
                networkType={network.type}
                shorten={false}
              />
              <VSpace size={2} />
              <Info>
                Use the above address or QR code to transfer {selectedTokenSymbol} directly to
                your organization’s Finance app. You should specify a gas limit
                of 350,000 for this transfer.
                <p
                  css={`
                    margin-top: ${1 * GU}px;
                    ${textStyle('body3')}
                    font-size: 12px;
                  `}
                >
                  <strong>WARNING</strong>: Do <strong>not</strong> send non-{selectedTokenSymbol}
                  (e.g. ERC-20) tokens directly to this address.
                </p>
              </Info>
            </ToggleContent>
          </div>
        )}
      </form>
    )
  }
}

const SelectedTokenBalance = ({ network, selectedToken }) => {
  const theme = useTheme()
  const {
    data: { decimals, loading, symbol, userBalance },
    value: address,
  } = selectedToken
  if (loading || !isAddress(address) || !userBalance) {
    return ''
  }

  return (
    <div
      css={`
        ${textStyle('body3')}
        color: ${theme.surfaceContentSecondary};
        /* Adjust for Field's bottom margin */
        margin: -${2 * GU}px 0 ${3 * GU}px;
      `}
    >
      {userBalance === '-1' ? (
        `Your balance could not be found for ${symbol}`
      ) : (
        <div
          css={`
            display: flex;
            align-items: center;
          `}
        >
          You have{' '}
          {userBalance === '0' ? 'no' : fromDecimals(userBalance, decimals)}{' '}
          {addressesEqual(address, ETHER_TOKEN_FAKE_ADDRESS) ? (
            `${symbol}`
          ) : (
            <span
              css={`
                margin: 0 ${0.5 * GU}px;
              `}
            >
              <TokenBadge
                address={address}
                symbol={symbol}
                networkType={network.type}
              />
            </span>
          )}{' '}
          available
        </div>
      )}
    </div>
  )
}

const VSpace = styled.div`
  height: ${p => (p.size || 1) * GU}px;
`

const ValidationError = ({ message }) => {
  const theme = useTheme()
  return (
    <div>
      <VSpace size={2} />
      <div
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
      </div>
    </div>
  )
}

export default props => {
  const { api, currentApp, connectedAccount, network } = useAragonApi()
  return network && api ? (
    <Deposit
      api={api}
      appAddress={currentApp && currentApp.appAddress}
      connectedAccount={connectedAccount}
      network={network}
      {...props}
    />
  ) : null
}
