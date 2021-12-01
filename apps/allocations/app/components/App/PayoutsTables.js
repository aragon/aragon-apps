import PropTypes from 'prop-types'
import React from 'react'
import styled from 'styled-components'

import { Badge, Text, theme } from '@aragon/ui'

const PayoutsTable = ({ list: List, ...listProps }) => (
  <div>
    <Text.Block size="large" weight="bold" style={{ marginBottom: '10px' }}>
      Allocations
      {' '}
      <Badge.Info>{listProps.data.length}</Badge.Info>
    </Text.Block>

    <List {...listProps} />
  </div>
)

PayoutsTable.propTypes = {
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  list: PropTypes.func.isRequired,

}

const PayoutDescription = styled(Text.Block)`
  display: block;
  /* stylelint-disable-next-line */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  /* stylelint-disable-next-line */
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  color: ${theme.textPrimary};
`

const NarrowList = styled.div`
  display: flex;
  flex-direction: column;
  background: ${theme.contentBackground};
  border: 1px solid ${theme.contentBorder};
  border-radius: 3px;
  > :not(:last-child) {
    border-bottom: 1px solid ${theme.contentBorder};
  }
`
const NarrowListPayout = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px;
`
const AmountBadge = styled(Badge).attrs({
  background: theme.contentBorder,
  foreground: theme.textPrimary,
})`
  padding: 10px;
  margin: 10px;
  font-size: large;
`
export { PayoutDescription, PayoutsTable, NarrowList, NarrowListPayout, AmountBadge }
