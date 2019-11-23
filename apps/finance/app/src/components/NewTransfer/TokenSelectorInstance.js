import React from 'react'
import styled from 'styled-components'
import { GU } from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import LocalIdentityBadge from '../LocalIdentityBadge/LocalIdentityBadge'
import { tokenIconUrl } from '../../lib/icon-utils'
import { ETHER_TOKEN_FAKE_ADDRESS } from '../../lib/token-utils'
import { addressesEqual } from '../../lib/web3-utils'

const TokenSelectorInstance = React.memo(function TokenSelectorInstance({
  address,
  name,
  symbol,
  showIcon = true,
}) {
  const network = useNetwork()
  return (
    <div
      css={`
        display: flex;
        align-items: center;
      `}
    >
      {showIcon ? (
        <Icon src={tokenIconUrl(address, symbol, network && network.type)} />
      ) : (
        <div
          css={`
            width: ${3 * GU}px;
          `}
        />
      )}
      {symbol && (
        <span
          css={`
            margin-right: ${1 * GU}px;
          `}
        >
          {symbol}
        </span>
      )}
      {name && (
        <span
          css={`
            max-width: 110px;
            margin-right: ${1 * GU}px;
            overflow: hidden;
            text-overflow: ellipsis;
          `}
        >
          ({name})
        </span>
      )}
      {!addressesEqual(address, ETHER_TOKEN_FAKE_ADDRESS) && (
        <LocalIdentityBadge badgeOnly compact entity={address} />
      )}
    </div>
  )
})

const Icon = styled.img.attrs({ alt: '', width: '16', height: '16' })`
  margin-right: ${1 * GU}px;
`

export default React.memo(TokenSelectorInstance)
