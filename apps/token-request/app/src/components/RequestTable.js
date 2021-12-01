import React, { useCallback, useMemo } from 'react'
import styled from 'styled-components'
import { DataView, Text, ContextMenu, ContextMenuItem, IconCoin, useTheme, IconVote, IconInfo } from '@aragon/ui'
import { useConnectedAccount } from '@aragon/api-react'
import { formatTokenAmountSymbol } from '../lib/token-utils'
import { format, compareDesc } from 'date-fns'
import { requestStatus } from '../lib/constants'
import LocalIdentityBadge from './LocalIdentityBadge/LocalIdentityBadge'
import { addressesEqual } from '../lib/web3-utils'

const PAGINATION = 10

const RequestTable = React.memo(({ requests, token, onSubmit, onWithdraw, ownRequests, onSelectRequest }) => {
  const connectedAccount = useConnectedAccount()
  const theme = useTheme()

  const handleSelectRequest = useCallback(
    requestId => {
      onSelectRequest(requestId)
    },
    [onSelectRequest]
  )

  const handleSubmit = useCallback(
    requestId => {
      onSubmit(requestId)
    },
    [onSubmit]
  )

  const handleWithdraw = useCallback(
    requestId => {
      onWithdraw(requestId)
    },
    [onWithdraw]
  )
  const fields = ['Request Date', 'Deposited', 'Requested', 'Status']
  !ownRequests && fields.splice(1, 0, 'Requester')

  const getEntries = useMemo(() => {
    return requests.map(r => [
      r.requestId,
      r.date,
      r.requesterAddress,
      r.depositAmount,
      r.depositSymbol,
      r.depositToken,
      r.depositName,
      r.depositDecimals,
      r.requestAmount,
      r.status,
      token.symbol,
      token.decimals,
    ])
  }, [requests, compareDesc, ownRequests])

  const getRow = (
    requestId,
    date,
    requesterAddress,
    depositAmount,
    depositSymbol,
    depositTokenAddress,
    depositName,
    depositDecimals,
    requestedAmount,
    status,
    requestedSymbol,
    requestedDecimals
  ) => {
    const timeColumn = [<time key={requestId}>{format(date, 'dd/MM/yy')}</time>]
    const commonColumns = [
      <Text>{`${formatTokenAmountSymbol(depositSymbol, depositAmount, depositDecimals)} `}</Text>,
      <Text>{`${formatTokenAmountSymbol(requestedSymbol, requestedAmount, requestedDecimals)} `}</Text>,
      <Status color={getStatusColor(status, theme).toString()}>{`${status}`}</Status>,
    ]
    return !ownRequests
      ? [
          timeColumn,
          <div
            css={`
              display: flex;
              align-items: flex-start;
            `}
          >
            <LocalIdentityBadge
              connectedAccount={addressesEqual(requesterAddress, connectedAccount)}
              entity={requesterAddress}
            />
          </div>,
          ...commonColumns,
        ]
      : [timeColumn, ...commonColumns]
  }

  const getActions = request => {
    const requestId = request[0]
    const status = request[9]
    return (
      <ContextMenu>
        <ContextMenuItem onClick={() => handleSelectRequest(requestId)}>
          <IconWrapper theme={theme}>
            <IconInfo />
          </IconWrapper>
          <div css='margin-left: 15px'>Info</div>
        </ContextMenuItem>
        {status === requestStatus.PENDING && (
          <ContextMenuItem onClick={() => handleSubmit(requestId)}>
            <IconWrapper theme={theme}>
              <IconVote />
            </IconWrapper>
            <div css='margin-left: 15px'>Submit</div>
          </ContextMenuItem>
        )}
        {status === requestStatus.PENDING && (
          <ContextMenuItem onClick={() => handleWithdraw(requestId)}>
            <IconWrapper theme={theme}>
              <IconCoin />
            </IconWrapper>
            <div css='margin-left: 15px'>Withdraw</div>
          </ContextMenuItem>
        )}
      </ContextMenu>
    )
  }

  return (
    <>
      {requests && requests.length > 0 && (
        <DataView
          fields={fields}
          entries={getEntries}
          renderEntry={request => getRow(...request)}
          renderEntryActions={request => getActions(request)}
          mode='adaptive'
          entriesPerPage={PAGINATION}
        />
      )}
    </>
  )
})

const getStatusColor = (status, theme) => {
  switch (status) {
    case requestStatus.PENDING:
      return theme.yellow
    case requestStatus.APPROVED:
      return theme.positive
    default:
      return theme.positive
  }
}

const IconWrapper = styled.span`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  color: ${({ theme }) => {
    theme.textSecondary
  }};
`
const Status = styled(Text)`
  font-weight: 600;
  color: ${({ color }) => {
    color
  }};
`

export default RequestTable
