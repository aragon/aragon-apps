import React from 'react'
import { Box, Text } from '@aragon/ui'
import RequestTable from '../components/RequestTable'
import { useConnectedAccount } from '@aragon/api-react'
import { addressesEqual } from '../lib/web3-utils'

const Requests = React.memo(({ requests, token, onSubmit, onWithdraw, ownRequests, onSelectRequest }) => {
  const filteredRequests = ownRequests
    ? requests && requests.filter(r => addressesEqual(r.requesterAddress, useConnectedAccount()))
    : requests
  return requests && requests.length > 0 ? (
    <RequestTable
      requests={filteredRequests}
      token={token}
      onSubmit={onSubmit}
      onWithdraw={onWithdraw}
      ownRequests={ownRequests}
      onSelectRequest={onSelectRequest}
    />
  ) : (
    <Box style={{ textAlign: 'center' }}>
      <Text>No requests</Text>
    </Box>
  )
})
export default Requests
