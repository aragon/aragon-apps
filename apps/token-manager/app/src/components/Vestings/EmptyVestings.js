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
          `}
        />
        <div
          css={`
            ${textStyle('title2')};
          `}
        >
          {isCurrentUser ? `You don't ` : `This account doesn’t `}have any
          vestings yet
        </div>
      </div>
    </div>
  )
}

export default EmptyVestings