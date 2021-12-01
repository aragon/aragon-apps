import React from 'react'
import { Text, breakpoint } from '@aragon/ui'
import styled from 'styled-components'

import BalanceToken from './BalanceToken'

export default function RedeemTokenList(props) {
  const { tokens, youGet } = props
  return (
    <Wrap>
      <Text style={{ marginBottom: '15px', display: 'block' }} size="xl">
        Amounts you will redeem from vault
      </Text>
      <List>
        {tokens.map((t, index) => {
          return (
            <ListItem key={index}>
              <BalanceToken
                name={t.name}
                symbol={t.symbol}
                decimals={t.decimals}
                amount={youGet[index]}
                verified={t.verified}
              />
            </ListItem>
          )
        })}
      </List>
    </Wrap>
  )
}

const Wrap = styled.div`
  margin-bottom: 30px;
`

const List = styled.ul`
  list-style: none;
  display: grid;
  grid-template-columns: 1fr;
  column-gap: 15px;
  row-gap: 15px;
  ${breakpoint(
    'small',
    `
    grid-template-columns: 1fr 1fr;
 `
  )}
`

const ListItem = styled.li`
  box-shadow: rgba(51, 77, 117, 0.2) 0px 1px 3px;
  padding: 5px 15px;
  border-radius: 4px;
`
