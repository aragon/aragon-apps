import React from 'react'
import styled from 'styled-components'
import { SafeLink, blockExplorerUrl } from '@aragon/ui'
import provideNetwork from '../provide-network'

import { ETHER_TOKEN_VERIFIED_ADDRESSES } from '../verified-tokens'

class TokenBadge extends React.PureComponent {
  render() {
    const { address, name, symbol, network } = this.props
    const verified = ETHER_TOKEN_VERIFIED_ADDRESSES.has(address.toLowerCase())
    return (
      <Main
        title={`${name} (${address})`}
        href={blockExplorerUrl('token', address, { networkType: network.type })}
      >
        <Label>
          {verified && (
            <Icon src={`https://chasing-coins.com/coin/logo/${symbol}`} />
          )}
          <NameWrapper>
            <Name>{name}</Name>
            {name !== symbol && <Symbol>({symbol})</Symbol>}
          </NameWrapper>
        </Label>
      </Main>
    )
  }
}

const Main = styled(SafeLink).attrs({ target: '_blank' })`
  overflow: hidden;
  display: flex;
  align-items: center;
  height: 24px;
  background: #daeaef;
  border-radius: 3px;
  cursor: pointer;
  text-decoration: none;
  padding: 0 8px;
`

const Label = styled.span`
  display: flex;
  align-items: center;
  white-space: nowrap;
  font-size: 15px;
  min-width: 0;
  flex-shrink: 1;
`

const Icon = styled.img.attrs({ alt: '', width: '16', height: '16' })`
  margin-right: 10px;
`

const NameWrapper = styled.span`
  flex-shrink: 1;
  display: flex;
  min-width: 0;
`

const Name = styled.span`
  flex-shrink: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 20%;
`

const Symbol = styled.span`
  flex-shrink: 0;
  margin-left: 5px;
`

export default provideNetwork(TokenBadge)
