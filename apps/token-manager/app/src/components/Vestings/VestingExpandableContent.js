import React from 'react'
import {
  GU,
  formatTokenAmount,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import { useVestedTokensInfo } from '../../app-logic'
import { formatDate, timePeriod } from '../../date-utils'

function VestingExpandableContent({ tokenDecimals, tokenSymbol, vesting }) {
  const theme = useTheme()
  const vestingInfo = useVestedTokensInfo(vesting)
  return (
    <div
      css={`
        display: flex;
        padding: ${3 * GU}px ${4 * GU}px;
        width: 100%;
        justify-content: space-between;
      `}
    >
      <div>
        <div
          css={`
            padding: ${1 * GU}px 0;
          `}
        >
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
              ${textStyle('label2')};
            `}
          >
            Start day
          </label>
          <p
            css={`
              ${textStyle('body4')};
            `}
          >
            {formatDate(new Date(parseInt(vesting.start)))}
          </p>
        </div>
        <div
          css={`
            padding: ${1 * GU}px 0;
          `}
        >
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
              ${textStyle('label2')};
            `}
          >
            End day
          </label>
          <p
            css={`
              ${textStyle('body4')};
            `}
          >
            {formatDate(new Date(parseInt(vesting.vesting)))}
          </p>
        </div>
      </div>
      <div>
        <div
          css={`
            padding: ${1 * GU}px 0;
          `}
        >
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
              ${textStyle('label2')};
            `}
          >
            Vesting period
          </label>
          <p
            css={`
              ${textStyle('body4')};
            `}
          >
            {timePeriod(
              new Date(parseInt(vesting.vesting)),
              new Date(parseInt(vesting.start))
            )}
          </p>
        </div>
        <div
          css={`
            padding: ${1 * GU}px 0;
          `}
        >
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
              ${textStyle('label2')};
            `}
          >
            Vesting cliff
          </label>
          <p
            css={`
              ${textStyle('body4')};
            `}
          >
            {timePeriod(
              new Date(parseInt(vesting.cliff)),
              new Date(parseInt(vesting.start))
            )}
          </p>
        </div>
      </div>
      <div>
        <div
          css={`
            padding: ${1 * GU}px 0;
          `}
        >
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
              ${textStyle('label2')};
            `}
          >
            Available to transfer
          </label>
          <p
            css={`
              ${textStyle('body4')};
            `}
          >
            {formatTokenAmount(vestingInfo.unlockedTokens, tokenDecimals, {
              symbol: tokenSymbol,
            })}
          </p>
        </div>
      </div>
    </div>
  )
}

export default VestingExpandableContent
