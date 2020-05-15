import React, { useCallback } from 'react'
import styled from 'styled-components'
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
  useTheme,
} from '@aragon/ui'
import SummaryBar from '../components/SummaryBar'
import SummaryRows from '../components/SummaryRows'
import VestingInfoBoxes from '../components/VestingInfoBoxes'
import { useAppLogic, toISODate, useVestedTokensInfo } from '../app-logic'
import { format, formatDistanceStrict, parseISO } from 'date-fns'

const formatDate = date => `${format(date, 'do MMM yyyy, HH:mm O')}`

function Details({ tokenSymbol, selectHolder, vestings }) {
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
                <VestingContent vesting={vesting} tokenSymbol={tokenSymbol} />,
                <ExpandableContent
                  vesting={vesting}
                  tokenSymbol={tokenSymbol}
                />,
              ])}
            />
          </Box>
        }
        secondary={
          <VestingInfoBoxes
            selectedHolder={selectedHolder}
            tokenSymbol={tokenSymbol}
            vestings={vestings}
          />
        }
        invert="horizontal"
      />
    </React.Fragment>
  )
}

function VestingContent({ vesting, tokenSymbol }) {
  const vestingInfo = useVestedTokensInfo(vesting)

  return (
    <div
      css={`
        display: flex;
        padding: ${3 * GU}px 0;
        width: 100%;
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
        {formatTokenAmount(vesting.amount, 18, { symbol: tokenSymbol })}
      </div>
      <div
        css={`
          flex-grow: 1;
        `}
      >
        <SummaryBar
          vestingInfo={vestingInfo}
          css={`
            margin-top: 0;
            margin-bottom: ${2 * GU}px;
          `}
        />
        <SummaryRows vestingInfo={vestingInfo} tokenSymbol={tokenSymbol} />
      </div>
    </div>
  )
}

function ExpandableContent({ vesting, tokenSymbol }) {
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
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
            `}
          >
            VESTING PERIOD
          </label>
          <p>
            {formatDistanceStrict(
              toISODate(vesting.vesting),
              toISODate(vesting.start)
            )}
          </p>
        </ContentBox>
        <ContentBox>
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
            `}
          >
            VESTING CLIFF
          </label>
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
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
            `}
          >
            AVAILABLE TO TRANSFER
          </label>
          <p>
            {formatTokenAmount(vestingInfo.unlockedTokens, 18, {
              symbol: tokenSymbol,
            })}
          </p>
        </ContentBox>
      </div>
    </div>
  )
}

const ContentBox = styled.div`
  padding: ${1 * GU}px 0;
  label {
    ${textStyle('label2')};
  }
  p {
    ${textStyle('body4')};
  }
  button {
    margin-top: ${1 * GU}px;
  }
`
export default Details
