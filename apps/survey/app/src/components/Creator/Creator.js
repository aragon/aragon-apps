import React from 'react'
import styled from 'styled-components'
import Blockies from 'react-blockies'
import { theme, SafeLink } from '@aragon/ui'

const etherscanBaseUrl = ''

class Creator extends React.Component {
  render() {
    const { address } = this.props
    const url = `${etherscanBaseUrl}/address/${address}`
    return (
      <Main>
        <Img>
          <Blockies seed={address} size={8} />
        </Img>
        <Address title={url}>
          <SafeLink href={url} target="_blank">
            {address}
          </SafeLink>
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

export default Creator
