import React from 'react'
import styled from 'styled-components'
import { theme } from '@aragon/ui'
import { formatNumber } from '../math-utils'

const SummaryRows = ({ yea, nay, symbol }) => (
  <div>
    <Row>
      <RowStart>
        <Bullet color={theme.positive} />
        <YesNo>Yes</YesNo>
        <div>{yea.pct}%</div>
      </RowStart>
      <Amount>
        {formatNumber(yea.amount, 5)} {symbol}
      </Amount>
    </Row>
    <Row>
      <RowStart>
        <Bullet color={theme.negative} />
        <YesNo>No</YesNo>
        <div>{nay.pct}%</div>
      </RowStart>
      <Amount>
        {formatNumber(nay.amount, 5)} {symbol}
      </Amount>
    </Row>
  </div>
)

const Row = styled.div`
  display: flex;
  width: 100%;
  margin-bottom: 10px;
  align-items: center;
  justify-content: space-between;
  white-space: nowrap;
`

const RowStart = styled.div`
  display: flex;
  align-items: center;
`

const Bullet = styled.div`
  flex-shrink: 0;
  display: block;
  width: 10px;
  height: 10px;
  margin-right: 15px;
  border-radius: 50%;
  background: ${({ color }) => color};
`

const YesNo = styled.div`
  width: 35px;
  color: ${theme.textSecondary};
`

const Amount = styled.div`
  color: ${theme.textTertiary};
`

export default SummaryRows
