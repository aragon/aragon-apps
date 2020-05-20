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
        <ContentBox>
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
            `}
          >
            START DAY
          </label>
          <p>{formatDate(toISODate(vesting.start))}</p>
        </ContentBox>
        <ContentBox>
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
            `}
          >
            END DAY
          </label>
          <p>{formatDate(toISODate(vesting.vesting))}</p>
        </ContentBox>
      </div>
      <div>
        <ContentBox>
          <label>VESTING PERIOD</label>
          <p>
            {formatDistanceStrict(
              toISODate(vesting.vesting),
              toISODate(vesting.start)
            )}
          </p>
        </ContentBox>
        <ContentBox>
          <label>VESTING CLIFF</label>
          <p>
            {formatDistanceStrict(
              toISODate(vesting.cliff),
              toISODate(vesting.start)
            )}
          </p>
        </ContentBox>
      </div>
      <div>
        <ContentBox>
          <label>AVAILABLE TO TRANSFER</label>
          <p>
            {formatTokenAmount(vestingInfo.unlockedTokens, tokenDecimals, {
              symbol: tokenSymbol,
            })}
          </p>
        </ContentBox>
      </div>
    </div>
  )
}

function ContentBox({ props, children }) {
  const theme = useTheme()
  return (
    <div
      css={`
        padding: ${1 * GU}px 0;
        label {
          color: ${theme.surfaceContentSecondary};
          ${textStyle('label2')};
        }
        p {
          ${textStyle('body4')};
        }
        button {
          margin-top: ${1 * GU}px;
        }
      `}
    >
      {children}
    </div>
  )
}

export default Details
