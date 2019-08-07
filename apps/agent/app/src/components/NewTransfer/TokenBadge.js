import React from 'react'
import styled from 'styled-components'

class TokenBadge extends React.PureComponent {
  render() {
    const { address, symbol } = this.props
    return (
      <Main title={address}>
        <Label>
          <Icon src={`https://chasing-coins.com/coin/logo/${symbol}`} />
          <span>{address}</span>
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

export default TokenBadge
