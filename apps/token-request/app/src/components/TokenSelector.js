import React from 'react'
import { DropDown, Field } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { ETHER_TOKEN_VERIFIED_BY_SYMBOL } from '../lib/verified-tokens'
import { isAddress } from '../lib/web3-utils'
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
    disabled: false,
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
          index: 0,
          address: resolvedAddress,
        })
      }
    )
  }
  getAddressFromTokens(index) {
    // Adjust for custom address
    const token = this.props.tokens[index]
    return token.address
  }
  getItems() {
    return [...this.getTokenItems()]
  }
  getTokenItems() {
    return (
      this.props.tokens &&
      this.props.tokens.map(({ address, name, symbol, verified }) => (
        <TokenSelectorInstance showIcon={verified} symbol={symbol} />
      ))
    )
  }
  render() {
    const { activeIndex, label, disabled } = this.props
    const items = this.getItems()
    return (
      <React.Fragment>
        {items && (
          <DropDown
            placeholder='Token'
            items={items}
            selected={activeIndex}
            onChange={this.handleChange}
            header={label}
            disabled={disabled}
            required
          />
        )}
      </React.Fragment>
    )
  }
}

export default props => {
  const network = useNetwork()
  return <TokenSelector network={network} {...props} />
}
