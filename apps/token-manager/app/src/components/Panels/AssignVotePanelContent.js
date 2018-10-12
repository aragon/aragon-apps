import React from 'react'
import styled from 'styled-components'
import { Button, Field, IconCross, Text, TextInput } from '@aragon/ui'
import BN from 'bn.js'
import { addressPattern, isAddress } from '../../web3-utils'

const initialState = {
  amount: '',
  mode: 'assign',
  holder: {
    error: null,
    value: '',
  },
}

class AssignVotePanelContent extends React.Component {
  static defaultProps = {
    onUpdateTokens: () => {},
  }
  constructor(props) {
    super(props)
    this.state = {
      ...initialState,
      ...props.holder,
    }
  }
  componentWillReceiveProps({ opened, holder = '', mode }) {
    if (opened && !this.props.opened) {
      // setTimeout is needed as a small hack to wait until the input's on
      // screen until we call focus
      this.holderInput && setTimeout(() => this.holderInput.focus(), 0)
    }

    if ((holder !== this.props.holder || mode !== this.props.mode) && opened) {
      // Holder override passed in from props
      this.setState({
        holder: {
          ...initialState.holder,
          value: holder,
        },
      })
    } else if (!opened && this.props.opened) {
      // Finished closing the panel, so reset its state
      this.setState({ ...initialState })
    }
  }
  handleAmountChange = event => {
    this.setState({ amount: event.target.value })
  }
  handleHolderChange = event => {
    this.setState({
      holder: {
        error: null,
        value: event.target.value,
      },
    })
  }
  handleSubmit = event => {
    event.preventDefault()
    const { amount, holder } = this.state
    const { mode } = this.props
    const holderAddress = holder.value.trim()
    if (isAddress(holderAddress)) {
      this.props.onUpdateTokens({
        mode,
        amount: amount,
        holder: holderAddress,
      })
    } else {
      this.setState(({ holder }) => ({
        holder: {
          ...holder,
          error: true,
        },
      }))
    }
  }
  render() {
    const { amount, holder } = this.state
    const { mode, tokenDecimalsBase } = this.props
    const tokenBase = tokenDecimalsBase
      ? new BN(1).div(tokenDecimalsBase).toNumber()
      : 0
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
              innerRef={holder => (this.holderInput = holder)}
              value={holder.value}
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
              value={amount}
              onChange={this.handleAmountChange}
              min={tokenBase}
              step={tokenBase}
              required
              wide
            />
          </Field>
          <Button mode="strong" type="submit" wide>
            {mode === 'assign' ? 'Assign' : 'Remove'} Tokens
          </Button>
          {holder.error && (
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
