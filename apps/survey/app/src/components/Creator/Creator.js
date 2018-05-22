import React from 'react'
import styled from 'styled-components'
import Blockies from 'react-blockies'
import { theme, SafeLink } from '@aragon/ui'

const etherscanBaseUrl = ''

class Creator extends React.Component {
  render() {
    const { address } = this.props
    return (
      <Main>
        <Img>
          <Blockies seed={address} size={8} />
        </Img>
        <div>
          <p>
            <SafeLink
              href={`${etherscanBaseUrl}/address/${address}`}
              target="_blank"
            >
              {address}
            </SafeLink>
          </p>
        </div>
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
  & + div a {
    color: ${theme.accent};
  }
`

export default Creator
