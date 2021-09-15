import React from 'react'
import styled from 'styled-components'

import { Box, Text, useTheme, useViewport } from '@aragon/ui'
import { formatTokenAmount } from '../lib/math-utils'

function Balance({ theme, below, total, tokenDecimals, tokenSymbol }) {
  const totalStr = `${
    total > 0 ? formatTokenAmount(total, false, tokenDecimals) : '0'
  } ${tokenSymbol}`

  return (
    <BoxPad borderColor={String(theme.positive)} belowMedium={below('medium')} unlocked={total > 0}>
      <Wrap>
        <Text>Unlocked balance:</Text>
        <Text
          weight="bold"
          css={`
            ${total > 0
              ? `
              background: ${theme.positive};
              padding: 4px 8px;
              border-radius: 3px;
              font-size: 18px;
              color: white;
            `
              : ''}
          `}
        >
          {totalStr}
        </Text>
      </Wrap>
    </BoxPad>
  )
}

const BoxPad = styled(Box)`
  > div {
    padding: 20px;
  }

  ${({ borderColor, belowMedium, unlocked }) =>
    belowMedium && unlocked
      ? `
    border-top: 2px solid ${borderColor};
    border-bottom: 2px solid ${borderColor};
    `
      : unlocked &&
        `
      border-left: 3px solid ${borderColor};
      border-top-left-radius: 0;
      border-bottom-left-radius: 0;
      `}
`

const Wrap = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`

export default props => {
  const theme = useTheme()
  const { below } = useViewport()
  return <Balance {...props} theme={theme} below={below} />
}
