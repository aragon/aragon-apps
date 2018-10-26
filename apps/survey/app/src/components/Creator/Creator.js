import React from 'react'
import styled from 'styled-components'
import Blockies from 'react-blockies'
import { theme, SafeLink } from '@aragon/ui'
import provideNetwork from '../../provide-network'

class Creator extends React.Component {
  render() {
    const {
      address,
      network: { etherscanBaseUrl },
    } = this.props
    const url = etherscanBaseUrl ? `${etherscanBaseUrl}/address/${address}` : ''
    return (
      <Main>
        <Img>
          <Blockies seed={address} size={8} />
        </Img>
        <Address title={url}>
          {url ? (
            <SafeLink href={url} target="_blank">
              {address}
            </SafeLink>
          ) : (
            address
          )}
        </Address>
      </Main>
    )
  }
}

const Main = styled.div`
  display: flex;
  align-items: center;
`
const Img = styled.div`
  margin-right: 20px;
  canvas {
    display: block;
    border: 1px solid ${theme.contentBorder};
    border-radius: 16px;
  }
`

const Address = styled.div`
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  color: ${theme.accent};
  a {
    color: ${theme.accent};
  }
`

export default provideNetwork(Creator)
