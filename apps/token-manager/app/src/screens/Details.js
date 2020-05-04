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
import { useAppLogic } from '../app-logic'

function Details() {
  const theme = useTheme()
  const { selectedHolder } = useAppLogic()
  return (
    <React.Fragment>
      <Bar></Bar>
      <Split
        primary={
          <Box>
            <Accordion
              items={[
                [
                  <VestingContent vestedTokens={'120'} />,
                  <ExpandableContent vestedTokens={'120'} />,
                ],
                [
                  <VestingContent vestedTokens={'120'} />,
                  <ExpandableContent vestedTokens={'120'} />,
                ],
                [
                  <VestingContent vestedTokens={'120'} />,
                  <ExpandableContent vestedTokens={'120'} />,
                ],
                [
                  <VestingContent vestedTokens={'120'} />,
                  <ExpandableContent vestedTokens={'120'} />,
                ],
                [
                  <VestingContent vestedTokens={'120'} />,
                  <ExpandableContent vestedTokens={'120'} />,
                ],
                [
                  <VestingContent vestedTokens={'120'} />,
                  <ExpandableContent vestedTokens={'120'} />,
                ],
                [
                  <VestingContent vestedTokens={'120'} />,
                  <ExpandableContent vestedTokens={'120'} />,
                ],
              ]}
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

function VestingContent({ vestedTokens }) {
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
        120 ETHI
      </div>
      <div
        css={`
          flex-grow: 1;
        `}
      >
        <SummaryBar
          lockedPercentage={parseInt(70)}
          unlockedPercentage={parseInt(30)}
          requiredSize={parseInt(30)}
          css={`
            margin-top: 0;
            margin-bottom: ${2 * GU}px;
          `}
        />
        <SummaryRows />
      </div>
    </div>
  )
}

function ExpandableContent({ vestedTokens }) {
  const theme = useTheme()
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
          <p>April 14, 2020, 7:03 PM GMT-3</p>
        </ContentBox>
        <ContentBox>
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
            `}
          >
            END DAY
          </label>
          <p>April 14, 2021, 7:03 PM GMT-3</p>
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
          <p>12 Month</p>
        </ContentBox>
        <ContentBox>
          <label
            css={`
              color: ${theme.surfaceContentSecondary};
            `}
          >
            VESTING CLIFF
          </label>
          <p>3 Month</p>
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
          <p>30 ETHI</p>
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
