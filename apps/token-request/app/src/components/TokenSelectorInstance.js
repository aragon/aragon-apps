import React from 'react'
import styled from 'styled-components'
import { Badge, Viewport } from '@aragon/ui'
import { ETHER_TOKEN_FAKE_ADDRESS } from '../lib/token-utils'
import { addressesEqual, shortenAddress } from '../lib/web3-utils'

class TokenSelectorInstance extends React.PureComponent {
  render() {
    const { symbol, showIcon = true } = this.props
    return (
      <Main>
        {showIcon ? <Icon src={`https://chasing-coins.com/coin/logo/${symbol}`} /> : <IconSpacer />}
        {symbol && <TokenSymbol>{symbol}</TokenSymbol>}
      </Main>
    )
  }
}

const Main = styled.div`
  display: flex;
  align-items: center;
`

const Icon = styled.img.attrs({ alt: '', width: '16', height: '16' })`
  margin-right: 10px;
`

const IconSpacer = styled.div`
  width: 26px;
`
const TokenSymbol = styled.span`
  margin-right: 10px;
`

export default props => (
  <Viewport>{({ below }) => <TokenSelectorInstance {...props} shorten={below('medium')} />}</Viewport>
)
