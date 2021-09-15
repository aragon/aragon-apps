import React from 'react'
import styled from 'styled-components'
import { GU } from '@aragon/ui'

const TokenSelectorInstance = item => {
  const { name, symbol, showIcon = true } = item
  return (
    <Main>
      {showIcon ? <Icon src={`https://chasing-coins.com/coin/logo/${symbol}`} /> : <IconSpacer />}
      {symbol && <TokenSymbol>{symbol}</TokenSymbol>}
      {name && <TokenName>({name})</TokenName>}
    </Main>
  )
}

const Main = styled.div`
  display: flex;
  align-items: center;
`

const Icon = styled.img.attrs({ alt: '', width: '16', height: '16' })`
  margin-right: ${1 * GU}px;
`

const IconSpacer = styled.div`
  width: ${3 * GU}px;
`

const TokenName = styled.span`
  max-width: 110px;
  margin-right: ${1 * GU}px;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TokenSymbol = styled.span`
  margin-right: ${1 * GU}px;
`

export default TokenSelectorInstance
