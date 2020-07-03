import React from 'react'
import { Button, GU, textStyle, useTheme } from '@aragon/ui'
import {
  VOTE_STATUS_PAUSED,
  VOTE_STATUS_ACTIVE,
  VOTE_STATUS_CANCELLED,
  VOTE_STATUS_CLOSED,
} from '../../disputable-vote-statuses'
import { getDisputableVoteStatus } from '../../disputable-utils'
import { useConnectedAccount } from '@aragon/api-react'
import { addressesEqual } from '../../web3-utils'

function DisputableActions({ status, submitter }) {
  const theme = useTheme()
  const connectedAccount = useConnectedAccount()

  //TODO: add claim collateral action validation

  if (status === VOTE_STATUS_PAUSED) {
    if (addressesEqual(submitter, connectedAccount)) {
      return (
        <React.Fragment>
          <Button
            css={`
              margin-bottom: ${2 * GU}px;
            `}
            mode="strong"
            wide
            label="Accept settlement"
          />
          <Button mode="normal" wide label="Raise dispute to court" />
        </React.Fragment>
      )
    }
  }
  if (status === VOTE_STATUS_ACTIVE) {
    if (addressesEqual(submitter, connectedAccount)) {
      return <Button mode="strong" wide label="Cancel vote" />
    }
    return <Button mode="strong" wide label="Challenge vote" />
  }
  return <Button mode="strong" wide label="Review details" />
}

export default DisputableActions
