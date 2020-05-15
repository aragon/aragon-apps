import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import { GU } from '@aragon/ui'
import tokenIcon from '../../assets/token.png'
import tokenIconDark from '../../assets/token-dark.png'

const TokenIcon = React.memo(function TokenIcon({}) {
  const { guiStyle } = useAragonApi()
  return (
    <img
      css={`
        max-height: ${6 * GU}px;
        margin-left: ${3 * GU}px;
        margin-right: ${2 * GU}px;
      `}
      src={guiStyle.appearance === 'light' ? tokenIcon : tokenIconDark}
      alt="Token"
    />
  )
})

export default TokenIcon
