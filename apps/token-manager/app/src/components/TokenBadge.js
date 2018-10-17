import React from 'react'
import styled from 'styled-components'

class TokenBadge extends React.PureComponent {
  render() {
    const { address, name, symbol } = this.props
    return (
      <Main title={`${name} (${address})`}>
        <Label>
          <Icon src={`https://chasing-coins.com/coin/logo/${symbol}`} />
          {name === symbol ? name : `${name} (${symbol})`}
        </Label>
      </Main>
    )
  }
}

const Main = styled.div`
  overflow: hidden;
  display: flex;
  align-items: center;
  height: 24px;
  background: #daeaef;
  border-radius: 3px;
  cursor: default;
`

const Label = styled.span`
  display: flex;
  align-items: center;
  padding: 0 8px;
  white-space: nowrap;
  font-size: 15px;
`

const Icon = styled.img.attrs({ alt: '', width: '16', height: '16' })`
  margin-right: 10px;
`

export default TokenBadge
