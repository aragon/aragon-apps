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

const getActions = (status, vote, connectedAccount, theme) => {
  //TODO: claim collateral action
  if (status === VOTE_STATUS_PAUSED) {
    if (addressesEqual(vote.disputable.action.submitter, connectedAccount)) {
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
    if (addressesEqual(vote.disputable.action.submitter, connectedAccount)) {
      return <Button mode="strong" wide label="Cancel vote" />
    }
    return <Button mode="strong" wide label="Challenge vote" />
  }
  return <Button mode="strong" wide label="Review details" />
}

function DisputableActions({ vote }) {
  const theme = useTheme()
  const status = getDisputableVoteStatus(vote)
  const connectedAccount = useConnectedAccount()

  if (!status) {
    return null
  }
  const actions = getActions(status, vote, connectedAccount, theme)

  return <React.Fragment>{actions}</React.Fragment>
}

export default DisputableActions
