import React from 'react'
import styled from 'styled-components'
import {
  Accordion,
  Bar,
  Box,
  Button,
  Split,
  GU,
  textStyle,
  useTheme,
} from '@aragon/ui'
import SummaryBar from '../components/SummaryBar'
import SummaryRows from '../components/SummaryRows'
import { useAppLogic, toISODate, useVestedTokensInfo } from '../app-logic'
import { format, formatDistanceStrict, parseISO } from 'date-fns'
import { useFromWei } from '../web3-utils'

const formatDate = date => `${format(date, 'do MMM yyyy, HH:mm O')}`

function Details({ tokenSymbol }) {
  const theme = useTheme()
  const { selectedHolder } = useAppLogic()
  return (
    <React.Fragment>
      <Bar></Bar>
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
          <React.Fragment>
            <Box heading="Vestings Info">
              <ul>
                {[
                  ['Total supply', <strong>0</strong>],
                  ['Vested', <strong>0</strong>],
                  ['Locked', <strong>0</strong>],
                  ['Unlocked', <strong>0</strong>],
                ].map(([label, content], index) => (
                  <li
                    key={index}
                    css={`
                      display: flex;
                      justify-content: space-between;
                      list-style: none;
                      color: ${theme.surfaceContent};

                      & + & {
                        margin-top: ${2 * GU}px;
                      }

                      > span:nth-child(1) {
                        color: ${theme.surfaceContentSecondary};
                      }
                      > span:nth-child(2) {
                        opacity: 0;
                        width: 10px;
                      }
                      > span:nth-child(3) {
                        flex-shrink: 1;
                      }
                      > strong {
                        text-transform: uppercase;
                      }
                    `}
                  >
                    <span>{label}</span>
                    <span>:</span>
                    {content}
                  </li>
                ))}
              </ul>
            </Box>
          </React.Fragment>
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
        {useFromWei(vesting.amount)} {tokenSymbol}
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
            {vestingInfo.unlockedTokens} {tokenSymbol}
          </p>
        </ContentBox>
        <ContentBox>
          <Button wide size="small" mode="normal">
            Transfer
          </Button>
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
