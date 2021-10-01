import React, { useReducer, useEffect, useCallback, useRef } from 'react'
import styled from 'styled-components'

import { Button, Field, GU, Info, Text, TextInput, useTheme } from '@aragon/ui'
import { useAppState } from '@aragon/api-react'

import { reduceTotal, lockReducer } from '../../lib/lock-utils'
import { formatTokenAmount } from '../../lib/math-utils'

const useUnlocked = locks => locks.filter(l => l.unlocked)
const getTotalRefund = locks => reduceTotal(locks)

const WithdrawLocks = React.memo(({ locks, withdraw, panelOpened }) => {
  const theme = useTheme()
  const { tokenSymbol, tokenDecimals } = useAppState()

  const unlocked = useUnlocked(locks)
  const [count, setCount] = useCount(unlocked.length)
  const refund = getTotalRefund(unlocked.slice(0, count.value))

  /* Panel opens =>  Focus input
   * Panel closes => Reset lock count state
   **/
  const inputRef = useRef(null)
  useEffect(() => {
    panelOpened ? inputRef.current.focus() : setCount(0)
  }, [panelOpened, setCount])

  const handleFormSubmit = useCallback(
    e => {
      e.preventDefault()
      withdraw(count.value)
    },
    [withdraw, count]
  )

  return (
    <form onSubmit={handleFormSubmit}>
      <Info
        title={'Lock action'}
        css={`
          margin: ${1 * GU}px 0;
        `}
      >
        This action will withdraw the {count.value === 1 ? '' : count.value} oldest lock
        {count.value > 1 && 's'}
      </Info>
      <Row>
        <Split
          css={`
            border-right: 1px solid ${theme.accent};
          `}
        >
          <h2>
            <Text smallcaps>Withdrawable locks</Text>
          </h2>
          <Text weight={'bold'}>{count.max}</Text>
        </Split>
        <Split>
          <h2>
            <Text smallcaps>Tokens back</Text>
          </h2>
          <Text weight={'bold'}>
            {`${formatTokenAmount(refund, false, tokenDecimals)} ${tokenSymbol}`}{' '}
          </Text>
        </Split>
      </Row>
      <Row>
        <Field label="Number of locks" style={{ width: '100%', marginBottom: '20px' }}>
          <TextInput
            type="number"
            name="count"
            wide
            value={count.value}
            step={'1'}
            min={'1'}
            max={count.max}
            onChange={setCount}
            ref={inputRef}
            required
            css={`
              border-top-right-radius: 0,
              border-bottom-right-radius: 0,
              border-right: 0,
            `}
          />
        </Field>
        <Max onClick={() => setCount(count.max)}>Max</Max>
      </Row>
      <Button type="submit" mode="strong" wide disabled={count.max <= 0}>
        Withdraw
      </Button>
    </form>
  )
})

function useCount(unlocked) {
  const [count, dispatch] = useReducer(lockReducer, { value: 0, max: unlocked })

  // When the number of unlocked changes => Update max
  useEffect(() => {
    dispatch({ type: 'SET_MAX', max: unlocked })
  }, [unlocked])

  // We use only one function for all cases the count can change
  const handleCountChange = useCallback(
    newValue => {
      const value = newValue.target ? newValue.target.value : newValue
      if (value <= count.max) {
        dispatch({ type: 'SET_COUNT', value })
      }
    },
    [count.max]
  )

  return [count, handleCountChange]
}

const Row = styled.div`
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
`

const Split = styled.div`
  flex-basis: 50%;
  padding: 20px;
  text-align: center;
`

const Max = styled.span`
  padding: 9px;
  background-color: #1ccde3;
  cursor: pointer;
  color: #ffffff;
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  width: 108px;
  text-align: center;
  box-shadow: 0px 0px 3px 0px #3ce6e0;
  transition: background-color 0.5s ease;

  &:hover {
    background-color: #58d1e0;
  }

  &:active {
    box-shadow: none;
  }
`

export default WithdrawLocks
