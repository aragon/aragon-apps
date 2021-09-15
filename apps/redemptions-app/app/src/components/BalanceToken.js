import React from 'react'
import styled from 'styled-components'
import { breakpoint, useTheme } from '@aragon/ui'
import { formatTokenAmount } from '../lib/math-utils'

const splitAmount = (amount, decimals) => {
  const [integer, fractional] = formatTokenAmount(amount, false, decimals).split('.')
  return (
    <span>
      <span className="integer">{integer}</span>
      {fractional && <span className="fractional">.{fractional}</span>}
    </span>
  )
}

const BalanceToken = ({ amount, symbol, decimals, verified, removable, theme }) => (
  <Balance removable={removable} negative={String(theme.negative)}>
    <Token color={String(theme.contentSecondary)}>
      {verified && symbol && (
        <img alt="" width="16" height="16" src={`https://chasing-coins.com/coin/logo/${symbol}`} />
      )}
      {symbol || '?'}
    </Token>

    <Bottom>
      <Amount>{splitAmount(amount, decimals)}</Amount>
    </Bottom>
  </Balance>
)

const Token = styled.div`
  display: flex;
  align-items: center;
  text-transform: uppercase;
  font-size: 20px;
  color: ${({ color }) => color};
  transition: opacity 0.3s ease, transform 0.4s ease;
  height: 100%;
  img {
    margin-right: 10px;
  }

  ${breakpoint(
    'medium',
    `
      font-size: 14px;
    
    `
  )}
`

const Bottom = styled.div`
  text-align: right;

  ${breakpoint(
    'medium',
    `
      text-align: left;
    `
  )};
`

const Amount = styled.div`
  font-size: 26px;
  transition: color 0.4s ease;
  .fractional {
    font-size: 14px;
  }
`

const Balance = styled.div`
  min-width: 75px;
  display: grid;
  grid-template-columns: 1fr 1fr;

  ${breakpoint(
    'medium',
    `
   display: block;
 `
  )}
`

export default props => {
  return <BalanceToken {...props} theme={useTheme()} />
}
