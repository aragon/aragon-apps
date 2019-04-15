import React from 'react'
import { Badge, Button, SafeLink } from '@aragon/ui'
import styled from 'styled-components'

export const TransactionBadge = ({
  background = 'none',
  fontSize = 'medium',
  foreground = '#000000',
  networkType = 'rinkeby',
  shorten = true,
  tx,
  shape,
}) => {
  const networkTypes = ['main', 'kovan', 'rinkeby', 'ropsten']
  if (networkTypes.indexOf(networkType) === -1) {
    console.warn(
      `Network ${networkType} is not valid. Please use one of the following: ${networkTypes.join(
        ', '
      )}`
    )
  }

  // FIXME - Wehn we move this to aragon-ui, I think this should be similar to https://github.com/aragon/aragon-ui/blob/master/src/components/IdentityBadge/IdentityBadge.js#L41
  const url = `https://${
    networkType === 'main' ? '' : `${networkType}.`
  }etherscan.io/tx/${tx}`

  return (
    <StyledBadge
      background={background}
      foreground={foreground}
      shorten={shorten}
      fontSize={fontSize}
    >
      <SafeLink href={url} target="_blank">
        {tx}
      </SafeLink>
    </StyledBadge>
  )
}

const StyledBadge = styled(Badge)`
  ${({ shorten }) =>
    shorten &&
    `
    width: 120px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  `}
  display: inline-block;
  font-weight: normal;
  padding-top: 2px;
  font-size: ${({ fontSize }) => {
    return {
      small: '12px',
      medium: '15px',
      large: '18px',
    }[fontSize]
  }};

  a {
    text-decoration: none;
  }
`
