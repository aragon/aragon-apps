import React from 'react'
import { DropDown, Field, TextInput } from '@aragon/ui'
import provideNetwork from '../../lib/provideNetwork'
import { ETHER_TOKEN_VERIFIED_BY_SYMBOL } from '../../lib/verified-tokens'
import { isAddress } from '../../lib/web3-utils'
import TokenSelectorInstance from './TokenSelectorInstance'

const INITIAL_STATE = {
  customToken: {
    address: '',
    value: '',
  },
}

class TokenSelector extends React.Component {
  static defaultProps = {
    activeIndex: 0,
    onChange: () => {},
    tokens: [],
    label: 'Token',
    labelCustomToken: 'Token address or symbol',
  }
  state = {
    ...INITIAL_STATE,
  }
  handleChange = index => {
    this.setState({ ...INITIAL_STATE }, () => {
      const address = this.getAddressFromTokens(index)
      this.props.onChange({
        address,
        index,
        value: address,
      })
    })
  }
  handleCustomTokenChange = event => {
    const { value } = event.target
    const { network } = this.props

    // Use the verified token address if provided a symbol and it matches
    // The symbols in the verified map are all capitalized
    const resolvedAddress =
      !isAddress(value) && network.type === 'main'
        ? ETHER_TOKEN_VERIFIED_BY_SYMBOL.get(value.toUpperCase()) || ''
        : value

    this.setState(
      {
        customToken: {
          value,
          address: resolvedAddress,
        },
      },
      () => {
        this.props.onChange({
          value,
          index: 1,
          address: resolvedAddress,
        })
      }
    )
  }
  getAddressFromTokens(index) {
    if (index === 0) {
      return ''
    }

    if (index === 1) {
      return this.state.customToken.address
    }

    // Adjust for title and custom address
    const token = this.props.tokens[index - 2]
    return token.address
  }
  getItems() {
    return ['Select a token', 'Other…', ...this.getTokenItems()]
  }
  getTokenItems() {
    return this.props.tokens.map(({ address, name, symbol, verified }) => (
      <TokenSelectorInstance
        address={address}
        name={name}
        showIcon={verified}
        symbol={symbol}
      />
    ))
  }
  render() {
    const { customToken } = this.state
    const { activeIndex, label, labelCustomToken } = this.props
    const items = this.getItems()
    const showCustomToken = activeIndex === 1
    return (
      <React.Fragment>
        <Field label={label}>
          <DropDown
            items={items}
            active={activeIndex}
            onChange={this.handleChange}
            wide
          />
        </Field>

        {showCustomToken && (
          <Field label={labelCustomToken}>
            <TextInput
              placeholder="SYM…"
              value={customToken.value}
              onChange={this.handleCustomTokenChange}
              wide
            />
          </Field>
        )}
      </React.Fragment>
    )
  }
}

export default provideNetwork(TokenSelector)
