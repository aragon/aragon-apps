import React from 'react'
import styled from 'styled-components'
import { Badge, BreakPoint } from '@aragon/ui'
import { ETHER_TOKEN_FAKE_ADDRESS } from '../../lib/token-utils'
import { addressesEqual, shortenAddress } from '../../lib/web3-utils'

class TokenSelectorInstance extends React.PureComponent {
  render() {
    const { address, name, shorten, symbol, showIcon = true } = this.props
    return (
      <Main>
        {showIcon ? (
          <Icon src={`https://chasing-coins.com/coin/logo/${symbol}`} />
        ) : (
          <IconSpacer />
        )}
        {symbol && <TokenSymbol>{symbol}</TokenSymbol>}
        {name && <TokenName>({name})</TokenName>}
        {!addressesEqual(address, ETHER_TOKEN_FAKE_ADDRESS) && (
          <StyledAddressBadge>
            {shortenAddress(address, shorten ? 5 : 10)}
          </StyledAddressBadge>
        )}
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

const TokenName = styled.span`
  max-width: 110px;
  margin-right: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
`

const TokenSymbol = styled.span`
  margin-right: 10px;
`

const StyledAddressBadge = styled(Badge.Identity)`
  flex-shrink: 0;
  margin-left: auto;
`

export default props => (
  <React.Fragment>
    <BreakPoint to="medium">
      <TokenSelectorInstance {...props} shorten />
    </BreakPoint>
    <BreakPoint from="medium">
      <TokenSelectorInstance {...props} />
    </BreakPoint>
  </React.Fragment>
)
