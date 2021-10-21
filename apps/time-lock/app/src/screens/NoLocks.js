import React from 'react'
import styled from 'styled-components'
import { EmptyStateCard, GU } from '@aragon/ui'

const NoLocks = React.memo(() => {
  return <EmptyCard text={<span css={'font-size : 16px'}>No tokens locked</span>} />
})

const EmptyCard = styled(EmptyStateCard)`
  margin-top: ${GU * 2}px;
  width: 100%;
  height: 220px;
  grid-template-rows: 130px 1fr;

  & > div > img {
    height: 140px;
  }
`

export default NoLocks
