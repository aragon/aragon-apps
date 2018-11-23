import React from 'react'
import { createPortal } from 'react-dom'
import styled from 'styled-components'
import { Button, DropDown, Info, SidePanel, Slider, theme, Text } from '@aragon/ui'

import { connect } from '../context/AragonContext'
import Input from '../components/Input'

class EditSalaryAllocation extends React.Component {
  changeHandlers = new Map()
  state = {}

  get pristine () {
    if (this.state.addresses == null || this.state.distribution == null) {
      return true
    }

    if (this.props.distribution.length !== this.state.distribution.length) {
      return false
    }

    return this.state.addresses.every((a, i) => this.props.addresses[i] === a) &&
      this.state.distribution.every((d, i) => this.props.distribution[i] === d)
  }

  get isValid () {
    const { addresses, distribution } = this.state

    const tokens = new Set(addresses)

    if (!addresses || tokens.size !== addresses.length) {
      return false
    }

    if (!distribution || tokens.size !== distribution.length) {
      return false
    }

    if (tokens.has('') && distribution[addresses.indexOf('')] > 0) {
      return false
    }

    return distribution.reduce((a, b) => a + b, 0) === 100
  }

  handleAddAnotherToken = () => {
    const addresses = this.state.addresses || this.props.addresses

    if (addresses) {
      const { availableTokens = [] } = this.props

      this.setState((state, props) => {
        const [addresses, distribution] = [
          state.addresses || props.addresses || [],
          state.distribution || props.distribution || []
        ]

        const unusedTokens = Array.from(availableTokens.keys()).filter(
          t => !addresses.includes(t)
        )

        return {
          addresses: [...addresses, unusedTokens[0]],
          distribution: [...distribution, 0]
        }
      })
    }
  }

  handleDistributionUpdate = (tokenAddress) => {
    if (!this.changeHandlers.has(tokenAddress)) {
      const handler = value => {
        const tokens = this.state.addresses || this.props.addresses || []
        const index = tokens.indexOf(tokenAddress)

        this.setState((state, props) => {
          const currDist = state.distribution || props.distribution

          const nextDist = currDist.slice()
          nextDist[index] = parseInt(value * 100)

          const allocation = nextDist.map((left, t) => ({ t, right: 100 - left }))
          allocation.splice(index, 1)
          allocation.sort((a, b) => b.right - a.right)

          for (const [i, { right, t }] of allocation.entries()) {
            const total = nextDist.reduce((acc, val) => acc + val, 0)
            const offset = Math.round((100 - total) / (allocation.length - i))

            nextDist[t] = offset > 0
              ? nextDist[t] + Math.min(offset, right)
              : Math.max(0, nextDist[t] + offset)
          }

          return {
            addresses: tokens,
            distribution: nextDist
          }
        })
      }

      this.changeHandlers.set(tokenAddress, handler)
    }

    return this.changeHandlers.get(tokenAddress)
  }

  handleFormSubmit = (event) => {
    event.preventDefault()

    const { app } = this.props

    if (app && this.isValid) {
      const [tokens, distribution] = [[], []]

      for (const [i, token] of this.state.addresses.entries()) {
        const value = this.state.distribution[i]

        if (value > 0) {
          const index = tokens.indexOf(token)

          if (index > -1) {
            distribution[index] += value
          } else {
            tokens.push(token)
            distribution.push(value)
          }
        }
      }

      app.determineAllocation(
        tokens,
        distribution
      ).subscribe(() => {
        this.props.onClose()
      })
    }
  }

  handlePanelToggle = (opened) => {
    if (!opened) {
      this.setState({ addresses: null, distribution: null })
    }
  }

  render () {
    const { availableTokens = [], opened, onClose } = this.props

    const [addresses, distribution] = [
      this.state.addresses || this.props.addresses || [],
      this.state.distribution || this.props.distribution || []
    ]

    const panel = (
      <SidePanel
        title='Edit salary allocation'
        opened={opened}
        onClose={onClose}
        onTransitionEnd={this.handlePanelToggle}
      >
        <Form onSubmit={this.handleFormSubmit}>
          <Info.Action title='Choose which tokens you get paid in'>
            You can add as many tokens as you like,
            as long as your DAO has these tokens.
          </Info.Action>

          <TokenList>
            {addresses.map((tokenAddress, index) => {
              const allocation = distribution[index]
              const symbol = availableTokens.get(tokenAddress)

              const options = Array.from(availableTokens.keys()).filter(
                t => t === tokenAddress || !addresses.includes(t)
              )

              const activeIndex = options.indexOf(tokenAddress) || 0

              return (
                <TokenAllocation key={`${index}-${tokenAddress}}`}>
                  <TokenAllocationLabel>TOKEN</TokenAllocationLabel>
                  <div />
                  <TokenAllocationLabel>PERCENTAGE</TokenAllocationLabel>
                  <TokenSelector
                    active={activeIndex + 1}
                    items={[
                      '\xa0',
                      ...options.map(t => availableTokens.get(t))
                    ]}
                    onChange={selectedIndex => {
                      const selectedToken = options[selectedIndex - 1] || ''

                      this.setState(() => {
                        const tokens = addresses.slice()
                        tokens[index] = selectedToken
                        const distribution = this.state.distribution || this.props.distribution

                        return {
                          addresses: tokens,
                          distribution
                        }
                      })
                    }}
                  />

                  <TokenDistribution
                    name={symbol}
                    value={allocation / 100}
                    onUpdate={this.handleDistributionUpdate(tokenAddress)}
                  />

                  <Percentage>
                    <Input value={allocation} readOnly />
                    <label>%</label>
                  </Percentage>

                </TokenAllocation>
              )
            })}

            {addresses.length < availableTokens.size && (
              <AddTokenButton onClick={this.handleAddAnotherToken}>
                Add another token
              </AddTokenButton>
            )}

          </TokenList>

          <Info.Permissions title='Submission note'>
            Your split contract will be updated on the blockchain,
            and you cannot request salary until it's complete
          </Info.Permissions>

          <SubmitButton disabled={this.pristine || !this.isValid}>
            Submit split configuration
          </SubmitButton>
        </Form>
      </SidePanel>
    )

    return createPortal(
      panel,
      document.getElementById(this.props.modalRootId || 'modal-root')
    )
  }
}

const Form = styled.form`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`

const TokenList = styled.section`
  flex: 1;
  margin-bottom: 2em;
`

const TokenAllocation = styled.div`
  display: grid;
  grid-template-columns: 70px 1fr 70px;
  align-items: center;
  margin-top: 1em;
`

const TokenAllocationLabel = styled(Text).attrs({
  size: 'xsmall',
  color: theme.textTertiary
})`
  margin-bottom: 1em;
`

const TokenSelector = styled(DropDown)``

const TokenDistribution = styled(Slider)``

const Percentage = styled.div`
  position: relative;

  input {
    padding: 8px 15px;
    padding-right: 30px;
    font-size: 15px;
    text-align: right;
  }

  label {
    position: absolute;
    color: ${theme.textTertiary};
    margin: 9px 0 9px -25px;
  }
`

const AddTokenButton = styled(Button).attrs({ mode: 'secondary' })`
  float: right;
  margin-top: 2em;
`

const SubmitButton = styled(Button).attrs({
  type: 'submit',
  mode: 'strong'
})`
  margin-top: 2em;
`

function mapStateToProps ({ tokens = [], salaryAllocation = [] }) {
  // Sort list by allocation from highest to lowest
  salaryAllocation.sort((a, b) => b.allocation - a.allocation)

  const allocation = new Map(
    salaryAllocation.map(({ address, allocation }) => [address, allocation])
  )

  const availableTokens = new Map(
    tokens.map(({ address, symbol }) => [address, symbol])
  )

  return {
    availableTokens,
    addresses: Array.from(allocation.keys()),
    distribution: Array.from(allocation.values())
  }
}

export default connect(mapStateToProps)(EditSalaryAllocation)
