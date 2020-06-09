import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import tokenIcon from '../../assets/token.svg'
import tokenIconDark from '../../assets/token-dark.svg'

const TokenIcon = React.memo(function TokenIcon({ ...props }) {
  const { guiStyle } = useAragonApi()
  return (
    <img
      alt=""
      {...props}
      src={guiStyle.appearance === 'light' ? tokenIcon : tokenIconDark}
    />
  )
})

export default TokenIcon
