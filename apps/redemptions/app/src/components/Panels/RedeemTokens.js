import React, { useCallback, useEffect, useState, useRef } from 'react'
import styled from 'styled-components'

import { Text, TextInput, Button, Slider, breakpoint, Field } from '@aragon/ui'
import RedeemTokenList from '../RedeemTokenList'
import { InfoMessage } from '../Message'

import { formatTokenAmount, toDecimals, safeDiv, fromDecimals, round } from '../../lib/math-utils'

const MAX_INPUT_DECIMAL_BASE = 6

// HELPERS
function getTokenExchange(tokens, amount, totalSupply) {
  return tokens.map(t => safeDiv(amount * t.amount, totalSupply))
}

function formatAmount(amount, decimals) {
  const rounding = Math.min(MAX_INPUT_DECIMAL_BASE, decimals)
  return formatTokenAmount(amount, false, decimals, false, { rounding })
}

const RedeemTokens = ({
  balance,
  symbol,
  decimals,
  totalSupply,
  tokens,
  onRedeemTokens,
  panelOpened,
}) => {
  // Get metrics
  const rounding = Math.min(MAX_INPUT_DECIMAL_BASE, decimals)
  const minTokenStep = fromDecimals('1', Math.min(MAX_INPUT_DECIMAL_BASE, decimals))

  // Format BN
  const formattedBalance = formatAmount(balance, decimals)
  const formattedSupply = formatAmount(totalSupply, decimals)

  // Use state
  const [{ value, max, progress }, setAmount, setProgress] = useAmount(
    formattedBalance.replace(',', ''),
    rounding
  )

  // Focus input
  const inputRef = useRef(null)
  useEffect(() => {
    if (panelOpened) {
      inputRef.current.focus()
    }
  }, [panelOpened])

  const handleFormSubmit = event => {
    event.preventDefault()

    onRedeemTokens(toDecimals(value, decimals))
  }

  // Filter tokens with 0 balance and get exchange
  const tokensWithBalance = tokens ? tokens.filter(t => !t.amount.isZero()) : []
  const youGet = getTokenExchange(tokensWithBalance, value, totalSupply / Math.pow(10, decimals))

  return (
    <div
      css={`
        margin-top: 1rem;
      `}
    >
      <form onSubmit={handleFormSubmit}>
        <InfoMessage
          title={'Redemption action'}
          text={`This action will burn ${value} ${symbol} tokens in exchange for redeemable tokens`}
        />
        <TokenInfo>
          You have{' '}
          <Text weight="bold">
            {formattedBalance} out of a total of {formattedSupply} {symbol}{' '}
          </Text>{' '}
          tokens for redemption
        </TokenInfo>
        <Wrapper>
          <SliderWrapper label="Amount to burn">
            <Slider value={progress} onUpdate={setProgress} />
          </SliderWrapper>
          <InputWrapper>
            <TextInput
              type="number"
              name="amount"
              wide={false}
              value={value}
              max={max}
              min={'0'}
              step={minTokenStep}
              onChange={setAmount}
              required
              ref={inputRef}
            />
            <Text size="large">{symbol}</Text>
          </InputWrapper>
        </Wrapper>
        {tokensWithBalance.length > 0 ? (
          <RedeemTokenList tokens={tokensWithBalance} youGet={youGet} />
        ) : (
          <Info>No eligible assets in the vault</Info>
        )}
        <Button
          mode="strong"
          wide
          type="submit"
          disabled={value <= 0 || tokensWithBalance.length === 0}
        >
          {'Redeem tokens'}
        </Button>
      </form>
    </div>
  )
}

// CUSTOM HOOK
const useAmount = (balance, rounding) => {
  const [amount, setAmount] = useState({
    value: balance,
    max: balance,
    progress: 1,
  })

  // If balance or rounding (unlikely) changes => Update max balance && Update amount based on progress
  useEffect(() => {
    setAmount(prevState => {
      // Recalculate value based on same progress and new balance
      const newValue = round(prevState.progress * balance, rounding)

      return { ...prevState, value: String(newValue), max: balance }
    })
  }, [balance, rounding])

  // Change amount handler
  const handleAmountChange = useCallback(
    event => {
      const newValue = Math.min(event.target.value, balance)
      const newProgress = safeDiv(newValue, balance)

      setAmount(prevState => ({
        ...prevState,
        value: String(newValue),
        progress: newProgress,
      }))
    },
    [balance]
  )

  // Change progress handler
  const handleSliderChange = useCallback(
    newProgress => {
      // Round amount to 2 decimals when changing slider
      // Check for edge case where setting max amount with more than 2 decimals
      const newValue =
        newProgress === 1 ? round(balance, rounding) : round(newProgress * balance, 2)

      setAmount(prevState => ({
        ...prevState,
        value: String(newValue),
        progress: newProgress,
      }))
    },
    [balance, rounding]
  )

  return [amount, handleAmountChange, handleSliderChange]
}

export default RedeemTokens

const Wrapper = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid #eaf6f6;
  border-top: 1px solid #eaf6f6;
  padding: 20px 0px;
`

const SliderWrapper = styled(Field)`
  flex-basis: 50%;
  > :first-child > :nth-child(2) {
    min-width: 150px;
    padding-left: 0;
    ${breakpoint(
      'medium',
      `
     min-width: 200px;
   `
    )}
  }
`
const InputWrapper = styled.div`
  flex-basis: 50%;
  display: flex;
  align-items: center;
  justify-content: space-evenly;

  > :first-child {
    width: 75%;
  }
`

const Info = styled.div`
  padding: 20px;
  margin-bottom: 20px;
  text-align: center;
`

const TokenInfo = styled.div`
  padding: 20px 0;
`
