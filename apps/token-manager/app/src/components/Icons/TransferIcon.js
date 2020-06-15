import React from 'react'
import { useAragonApi } from '@aragon/api-react'
import icon from '../../assets/transfer-token.svg'
import iconDark from '../../assets/transfer-token-dark.svg'

const TransferTokenIcon = React.memo(function TransferTokenIcon({ ...props }) {
  const { guiStyle } = useAragonApi()
  return (
    <img
      src={guiStyle.appearance === 'light' ? icon : iconDark}
      alt=""
      {...props}
    />
  )
})

export default TransferTokenIcon
