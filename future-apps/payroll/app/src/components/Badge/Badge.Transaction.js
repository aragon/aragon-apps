import React from 'react'
import { Badge, Button, SafeLink } from '@aragon/ui'
import styled from 'styled-components'

export const TransactionBadge = ({
  background = "none",
  fontSize = "medium",
  foreground = "#000000",
  networkType = "rinkeby",
  shorten = true,
  tx,
  shape
}) => {
  const networkTypes = ["rinkeby", "mainnet", "rpc"]
  if (networkTypes.indexOf(networkType) === -1) {
    console.error(`Network ${networkType} is not valid. Please use one of the following: ${networkTypes.join(', ')}`)
    return null;
  }

  const url = `https://${networkType}.etherscan.io/tx/${tx}`

  return (
    <SafeLink
      href={url}
      target="_blank"
    >
      <StyledBadge
        background={background}
        foreground={foreground}
        shorten={shorten}
        fontSize={fontSize}
      >
        {tx}
      </StyledBadge>
    </SafeLink>
  )
}

const StyledBadge = styled(Badge)`
  ${({ shorten }) => shorten && `
    width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `}
  display: inline-block;
  font-weight: normal;
  padding-top: 2px;
  font-size: ${({ fontSize }) => {
    return ({
      small: '12px',
      medium: '15px',
      large: '18px'
    })[fontSize]
  }};

  a {
    text-decoration: none;
  }
`
