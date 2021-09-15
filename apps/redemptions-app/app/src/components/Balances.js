import React from 'react'
import styled from 'styled-components'
import { useTheme, Box, breakpoint, Button, useViewport, GU } from '@aragon/ui'

import BalanceToken from './BalanceToken'

const Balances = React.memo(({ tokens, onRequestUpdate, theme, belowMedium }) => {
  return (
    <>
      <Box heading="Redeemable tokens" padding={0}>
        <List>
          {tokens.map(({ address, name, decimals, amount, symbol, verified }) => {
            return (
              <ListItem key={address} borderColor={String(theme.border)}>
                <BalanceToken
                  name={name}
                  symbol={symbol}
                  decimals={decimals}
                  amount={amount}
                  verified={verified}
                  removable
                />
              </ListItem>
            )
          })}
          {!belowMedium &&
            UpdateTokenButton({ wide: false, onClick: onRequestUpdate, css: `margin: 20px;` })}
        </List>
      </Box>
      {belowMedium && (
        <Wrapper>{UpdateTokenButton({ wide: true, onClick: onRequestUpdate })}</Wrapper>
      )}
    </>
  )
})

const List = styled.ul`
  list-style: none;
  width: 100%;
  ${breakpoint(
    'medium',
    `
    width: auto;
    display: flex;
    flex-wrap: wrap;
    align-items: center
    padding: 0 10px;
 `
  )};
`

const ListItem = styled.li`
  padding: ${GU}px ${2 * GU}px;
  & :not(:last-child) {
    border-bottom: ${({ borderColor }) => `1px solid ${borderColor};`};
  }

  ${breakpoint(
    'medium',
    `
   padding: 25px;
   border-bottom: 0 !important;
 `
  )};
`

const UpdateTokenButton = ({ css, ...props }) => (
  <Button mode={'normal'} css={css} {...props}>
    Add / Remove
  </Button>
)

const Wrapper = styled.div`
  margin: 1rem 1.5rem;
`

export default props => {
  const { below } = useViewport()
  return <Balances {...props} belowMedium={below('medium')} theme={useTheme()} />
}
