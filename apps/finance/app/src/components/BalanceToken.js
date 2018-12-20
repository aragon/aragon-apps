import React from 'react'
import styled from 'styled-components'
import { theme } from '@aragon/ui'
import { formatTokenAmount } from '../lib/utils'

const splitAmount = amount => {
  const [integer, fractional] = formatTokenAmount(amount).split('.')
  return (
    <span>
      <span className="integer">{integer}</span>
      {fractional && <span className="fractional">.{fractional}</span>}
    </span>
  )
}

const BalanceToken = ({ amount, symbol, verified, convertedAmount = -1 }) => (
  <Main>
    <Token title={symbol || 'Unknown symbol'}>
      {verified &&
        symbol && (
          <img
            alt=""
            width="16"
            height="16"
            src={`https://chasing-coins.com/coin/logo/${symbol}`}
          />
        )}
      {symbol || '?'}
    </Token>
    <Amount>{splitAmount(amount.toFixed(3))}</Amount>
    <ConvertedAmount>
      {convertedAmount >= 0
        ? `$${formatTokenAmount(convertedAmount.toFixed(2))}`
        : '−'}
    </ConvertedAmount>
  </Main>
)

const Main = styled.div``

const Token = styled.div`
  display: flex;
  align-items: center;
  text-transform: uppercase;
  font-size: 14px;
  color: ${theme.textSecondary};
  img {
    margin-right: 10px;
  }
`

const Amount = styled.div`
  font-size: 26px;
  .fractional {
    font-size: 14px;
  }
`

const ConvertedAmount = styled.div`
  color: ${theme.textTertiary};
`

export default BalanceToken
