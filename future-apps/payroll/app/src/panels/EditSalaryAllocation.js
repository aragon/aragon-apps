import React, { useCallback, useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import styled from 'styled-components'
import { useAppState } from '@aragon/api-react'
import {
  Button,
  DropDown,
  IconAttention,
  Info,
  SidePanel,
  Slider,
  theme,
  Text,
} from '@aragon/ui'
import { useDetermineAllocationAction } from '../app-logic'
import { TokenType } from '../types'

function transformToTokenAllocations(salaryAllocations) {
  return Array.isArray(salaryAllocations)
    ? salaryAllocations.map(({ allocation, symbol, token }) => [
        token.address,
        allocation.toNumber(),
      ])
    : []
}

const EditSalaryAllocation = React.memo(
  ({ currentEmployeeSalaryAllocations, panelState }) => {
    const tokenAllocationsFromProps = transformToTokenAllocations(
      currentEmployeeSalaryAllocations
    )
    const allocationsKey = tokenAllocationsFromProps
      .map(([address, allocation]) => `${address}:${allocation}`)
      .join(',')

    // TODO: make sure this works correctly; we should allow contract event updates to update these
    // values
    const { tokenAllocations, setTokenAllocations } = useState(
      tokenAllocationsFromProps
    )
    const { modified, setModified } = useState(false)

    useEffect(() => {
      setTokenAllocations(
        transformToTokenAllocations(currentEmployeeSalaryAllocations)
      )
      setModified(false)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [allocationsKey])

    const handleDetermineAllocation = useDetermineAllocationAction(
      panelState.requestClose
    )
    const { allowedTokens } = useAppState()

    const handleTokenAllocationChange = tokenAllocations => {
      setTokenAllocations(tokenAllocations)
      setModified(true)
    }

    return (
      <SidePanel
        title="Edit salary allocation"
        opened={panelState.visible}
        onClose={panelState.requestClose}
        onTransitionEnd={panelState.onTransitionEnd}
      >
        <EditSalaryAllocationContent
          allowedTokens={allowedTokens}
          modified={modified}
          onDetermineAllocation={handleDetermineAllocation}
          onTokenAllocationChange={handleTokenAllocationChange}
          tokenAllocations={tokenAllocations}
        />
      </SidePanel>
    )
  }
)

class EditSalaryAllocationContent extends React.Component {
  static propTypes = {
    allowedTokens: PropTypes.arrayOf(TokenType).isRequired,
    modified: PropTypes.bool.isRequired,
    onDetermineAllocation: PropTypes.func.isRequired,
    onTokenAllocationChange: PropTypes.func.isRequired,
    tokenAllocations: PropTypes.array.isRequired,
  }

  handleAddAnotherToken = () => {
    const {
      allowedTokens,
      tokenAllocations,
      onTokenAllocationChange,
    } = this.props

    // Find first allowed token that is not already allocated
    const allocatedSet = new Set(
      ...tokenAllocations.map(([address]) => address)
    )
    const newToken = allowedTokens.find(
      ({ address }) => !allocatedSet.has(address)
    )

    onTokenAllocationChange(tokenAllocations.concat([newToken.address, 0]))
  }

  // TODO: linked sliders' implementation
  // (make sure values are always 0-100 integers and sum to exactly 100)
  handleAllocationChange = (tokenAddress, value) => {
    const { onTokenAllocationChange, tokenAllocations } = this.props

    const newAllocations = Array.from(tokenAllocations)

    // Replace the old allocation's value
    const allocationIndex = newAllocations.findIndex(
      ([address]) => address === tokenAddress
    )
    newAllocations[allocationIndex][1] = Math.round(value * 100)

    onTokenAllocationChange(newAllocations)
  }

  handleAllocationTokenChange = (tokenAddress, newTokenAddress) => {
    const { onTokenAllocationChange, tokenAllocations } = this.props

    const newAllocations = Array.from(tokenAllocations)

    // Replace the old allocation's address
    const allocationIndex = newAllocations.findIndex(
      ([address]) => address === tokenAddress
    )
    newAllocations[allocationIndex][0] = newTokenAddress

    onTokenAllocationChange(newAllocations)
  }

  handleFormSubmit = event => {
    const { onDetermineAllocation, tokenAllocations } = this.props
    event.preventDefault()

    const [tokens, allocations] = tokenAllocations
      // Remove empty allocations
      .filter(([, allocation]) => !!allocation)
      .reduce(
        ([tokens, allocations], [token, allocation]) => {
          tokens.push(token)
          allocations.push(allocation)
        },
        [[], []]
      )
    onDetermineAllocation(tokens, allocations)
  }

  getAvailableTokens() {
    const { allowedTokens, tokenAllocations } = this.props

    // Filter allowed tokens for ones that are not already allocated
    const allocatedSet = new Set(
      ...tokenAllocations.map(([address]) => address)
    )
    return allowedTokens.filter(({ address }) => !allocatedSet.has(address))
  }

  getTokenSymbol(tokenAddress) {
    const { allowedTokens } = this.props
    const token =
      allowedTokens.find(({ address }) => address === tokenAddress) || {}
    return token.symbol
  }

  isValid() {
    const { tokenAllocations } = this.props
    return (
      tokenAllocations.reduce((sum, [, allocation]) => sum + allocation, 0) ===
      100
    )
  }

  render() {
    const { allowedTokens, modified, tokenAllocations } = this.props
    const availableTokens = this.getAvailableTokens()
    const valid = this.isValid()

    return (
      <Form onSubmit={this.handleFormSubmit}>
        <Info.Action title="Choose which tokens you receive salary in">
          You can select as many tokens as you like, as long as the
          organization's vault has enough to fulfill your salary request.
        </Info.Action>

        <section
          css={`
            flex: 1;
            margin-bottom: 2em;
          `}
        >
          {tokenAllocations.map(([address, allocation]) => (
            <TokenAllocation
              key={address}
              allocation={allocation}
              availableTokens={availableTokens}
              onAllocationChange={this.handleAllocationChange}
              onAllocationTokenChange={this.handleAllocationTokenChange}
              selectedToken={{
                address,
                symbol: this.getTokenSymbol(address),
              }}
            />
          ))}

          {tokenAllocations.length < allowedTokens.size && (
            <Button
              mode="secondary"
              onClick={this.handleAddAnotherToken}
              css={`
                float: right;
                margin-top: 2em;
              `}
            >
              Add another token
            </Button>
          )}
        </section>

        <Info.Permissions icon={<IconAttention />}>
          {valid
            ? 'Your new token distribution will only apply to new salary requests'
            : 'Your selected distributions must sum to 100%'}
        </Info.Permissions>

        <Button
          mode="strong"
          type="submit"
          disabled={modified && valid}
          css={`
            margin-top: 2em;
          `}
        >
          Submit split configuration
        </Button>
      </Form>
    )
  }
}

const TokenAllocation = React.memo(
  ({
    allocation,
    availableTokens,
    onAllocationChange,
    onAllocationTokenChange,
    selectedToken,
  }) => {
    const tokenSymbols = [selectedToken.symbol].concat(
      availableTokens.map(({ symbol }) => symbol)
    )
    const handleAllocationChange = useCallback(
      value => {
        onAllocationChange(selectedToken.address, value)
      },
      [onAllocationChange, selectedToken.address]
    )
    const handleTokenChange = useCallback(
      index => {
        onAllocationTokenChange(
          selectedToken.address,
          availableTokens[index - 1].address
        )
      },
      [availableTokens, onAllocationTokenChange, selectedToken.address]
    )

    return (
      <div
        css={`
          display: grid;
          grid-template-columns: 70px 1fr 70px;
          align-items: center;
          margin-top: 1em;
        `}
      >
        <TokenAllocationLabel>TOKEN</TokenAllocationLabel>
        <div />
        <TokenAllocationLabel>PERCENTAGE</TokenAllocationLabel>
        <DropDown
          active={0}
          items={tokenSymbols}
          onChange={handleTokenChange}
        />
        <Slider value={allocation / 100} onUpdate={handleAllocationChange} />
        <Percentage>{`${allocation} %`}</Percentage>
      </div>
    )
  }
)

const Form = styled.form`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
`

const TokenAllocationLabel = styled(Text).attrs({
  size: 'xsmall',
  color: theme.textTertiary,
})`
  margin-bottom: 1em;
`

const Percentage = styled(Text).attrs({
  color: theme.textTertiary,
})`
  position: relative;
  border: 1px solid #e6e6e6;
  border-radius: 3px;
  padding: 8px 15px;
  font-size: 15px;
  text-align: right;
`

export default EditSalaryAllocation
