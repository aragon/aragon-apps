import React from 'react'
import {
  GU,
  formatTokenAmount,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import SummaryBar from '../SummaryBar'
import SummaryRow from '../SummaryRow'
import { useVestedTokensInfo } from '../../app-logic'

function VestingContent({ tokenDecimals, tokenSymbol, vesting }) {
  const theme = useTheme()
  const { layoutName } = useLayout()
  const compact = layoutName === 'small'
  const vestingInfo = useVestedTokensInfo(vesting)

  return (
    <div
      css={`
        display: flex;
        padding: ${3 * GU}px 0;
        width: 100%;
        flex-direction: ${compact ? 'column' : 'row'};
      `}
    >
      <div
        css={`
          flex-shrink: 0;
          flex-grow: 0;
          width: ${33 * GU}px;
          display: flex;
          align-items: center;
        `}
      >
        {formatTokenAmount(vesting.data.amount, tokenDecimals, {
          symbol: tokenSymbol,
        })}
      </div>
      <div
        css={`
          flex-grow: 1;
        `}
      >
        <SummaryBar
          negativePercentage={vestingInfo.lockedPercentage}
          positivePercentage={vestingInfo.unlockedPercentage}
          separator={vestingInfo.cliffProgress}
        />
        <div
          css={`
            ${textStyle('body2')};
            display: inline-block;
            width: 100%;
          `}
        >
          <SummaryRow
            color={theme.positive}
            label="Unlocked tokens"
            pct={vestingInfo.unlockedPercentage}
            content={formatTokenAmount(
              vestingInfo.unlockedTokens,
              tokenDecimals,
              {
                symbol: tokenSymbol,
              }
            )}
          />
          <SummaryRow
            color={theme.negative}
            label="Locked tokens"
            pct={vestingInfo.lockedPercentage}
            content={formatTokenAmount(
              vestingInfo.lockedTokens,
              tokenDecimals,
              {
                symbol: tokenSymbol,
              }
            )}
          />
        </div>
      </div>
    </div>
  )
}

export default VestingContent
