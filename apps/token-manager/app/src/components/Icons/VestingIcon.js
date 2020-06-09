import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import icon from '../../assets/vested-token.svg'
import iconDark from '../../assets/vested-token-dark.svg'

const VestingTokenIcon = React.memo(function VestingTokenIcon({ ...props }) {
  const { guiStyle } = useAragonApi()
  return (
    <img
      src={guiStyle.appearance === 'light' ? icon : iconDark}
      alt=""
      {...props}
    />
  )
})

export default VestingTokenIcon
