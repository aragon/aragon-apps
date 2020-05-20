import React, { useCallback } from 'react'
import {
  Accordion,
  Bar,
  BackButton,
  Box,
  Button,
  GU,
  Split,
  formatTokenAmount,
  textStyle,
  useLayout,
  useTheme,
} from '@aragon/ui'
import VestingContent from '../components/VestingContent'
import VestingInfoBoxes from '../components/VestingInfoBoxes'
import { useAppLogic, toISODate, useVestedTokensInfo } from '../app-logic'
import { format, formatDistanceStrict, parseISO } from 'date-fns'

const formatDate = date => `${format(date, 'do MMM yyyy, HH:mm O')}`

function Details({ tokenSymbol, tokenDecimals, selectHolder, vestings }) {
  const theme = useTheme()
  const { selectedHolder } = useAppLogic()
  const handleBack = useCallback(() => selectHolder(-1), [selectHolder])
  return (
    <React.Fragment>
      <Bar>
        <BackButton onClick={handleBack} />
      </Bar>
      <Split
        primary={
          <Box>
            <Accordion
              items={selectedHolder.vestings.map(vesting => [
                <VestingContent
                  tokenDecimals={tokenDecimals}
                  tokenSymbol={tokenSymbol}
                  vesting={vesting}
                />,
                <ExpandableContent
                  tokenDecimals={tokenDecimals}
                  tokenSymbol={tokenSymbol}
                  vesting={vesting}
                />,
              ])}
            />
          </Box>
        }
        secondary={
          <VestingInfoBoxes
            selectedHolder={selectedHolder}
            tokenDecimals={tokenDecimals}
            tokenSymbol={tokenSymbol}
          />
        }
        invert="horizontal"
      />
    </React.Fragment>
  )
}

function ExpandableContent({ tokenDecimals, tokenSymbol, vesting }) {
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
            {formatDistanceStrict(
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
            {formatDistanceStrict(
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

export default Details
