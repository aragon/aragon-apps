import React from 'react'
import { useConnectedAccount } from '@aragon/api-react'
import { GU, textStyle } from '@aragon/ui'
import { useAppLogic } from '../../app-logic'
import emptyImage from '../../assets/no-vestings.png'
import { addressesEqual } from '../../web3-utils'

function EmptyVestings() {
  const { selectedHolder } = useAppLogic()
  const connectedAccount = useConnectedAccount()
  const isCurrentUser = addressesEqual(selectedHolder.address, connectedAccount)

  return (
    <div
      css={`
        display: flex;
        padding: ${3 * GU}px 0;
        width: 100%;
        align-items: center;
        justify-content: center;
      `}
    >
      <div
        css={`
          text-align: center;
        `}
      >
        <img
          alt=""
          src={emptyImage}
          css={`
            margin: auto;
            min-height: 243px;
          `}
        />
        <div
          css={`
            margin-top: ${1 * GU}px;
            ${textStyle('title2')};
          `}
        >
          {isCurrentUser ? 'You do not' : 'This account does not'} own any
          vestings yet
        </div>
      </div>
    </div>
  )
}

export default EmptyVestings
