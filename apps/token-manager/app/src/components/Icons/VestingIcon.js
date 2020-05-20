import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import { GU } from '@aragon/ui'
import icon from '../../assets/vested-token.svg'
import iconDark from '../../assets/vested-token-dark.svg'

const VestingTokenIcon = React.memo(function VestingTokenIcon({}) {
  const { guiStyle } = useAragonApi()
  return (
    <img
      css={`
        max-height: ${6 * GU}px;
        margin-left: ${3 * GU}px;
        margin-right: ${2 * GU}px;
      `}
      src={guiStyle.appearance === 'light' ? icon : iconDark}
      alt=""
    />
  )
})

export default VestingTokenIcon
