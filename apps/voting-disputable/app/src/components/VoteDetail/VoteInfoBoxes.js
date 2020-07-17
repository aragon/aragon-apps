import React from 'react'
import {
  Box,
  Help,
  IconTime,
  Timer,
  TransactionBadge,
  textStyle,
  useLayout,
  useTheme,
  GU,
} from '@aragon/ui'
import { useNetwork } from '@aragon/api-react'
import { formatDate } from '../../utils'
import { round } from '../../math-utils'
import SummaryBar from '../SummaryBar'
import VoteStatus from '../VoteStatus'

function VoteInfoBoxes({
  minAcceptQuorum,
  quorumProgress,
  supportRequired,
  votesYeaVotersSize,
  vote,
}) {
  const { layoutName } = useLayout()
  const compactMode = layoutName === 'small'

  return (
    <div
      css={`
        margin-top: ${2 * GU}px;
        display: grid;
        grid-template-columns: ${compactMode ? '1fr' : '1fr 1fr 1fr'};
        grid-template-rows: ${compactMode ? '1fr 1fr 1fr' : '1fr'};
        grid-gap: ${2 * GU}px;
      `}
    >
      <div>
        <Box
          heading="Status"
          css={`
            height: 100%;
          `}
          padding={(compactMode ? 2 : 3) * GU}
        >
          <Status vote={vote} />
        </Box>
      </div>
      <div>
        <Box
          heading={
            <React.Fragment>
              Support %
              <Help hint="What is Support?">
                <strong>Support</strong> is the relative percentage of tokens
                that are required to vote “Yes” for a proposal to be approved.
                For example, if “Support” is set to 50%, then more than 50% of
                the tokens used to vote on a proposal must vote “Yes” for it to
                pass.
              </Help>
            </React.Fragment>
          }
          css={`
            height: 100%;
          `}
          padding={(compactMode ? 2 : 3) * GU}
        >
          <SummaryWithPercentages
            positiveSize={votesYeaVotersSize}
            requiredSize={supportRequired}
          />
        </Box>
      </div>
      <div>
        <Box
          heading={
            <React.Fragment>
              Minimum Approval %
              <Help hint="What is Minimum Approval?">
                <strong>Minimum Approval</strong> is the percentage of the total
                token supply that is required to vote “Yes” on a proposal before
                it can be approved. For example, if the “Minimum Approval” is
                set to 20%, then more than 20% of the outstanding token supply
                must vote “Yes” on a proposal for it to pass.
              </Help>
            </React.Fragment>
          }
          css={`
            height: 100%;
          `}
          padding={(compactMode ? 2 : 3) * GU}
        >
          <SummaryWithPercentages
            positiveSize={quorumProgress}
            requiredSize={minAcceptQuorum}
          />
        </Box>
      </div>
    </div>
  )
}

function SummaryWithPercentages({ positiveSize, requiredSize }) {
  const theme = useTheme()

  return (
    <React.Fragment>
      <div
        css={`
          ${textStyle('body2')};
        `}
      >
        {round(positiveSize * 100, 2)}%{' '}
        <span
          css={`
            color: ${theme.surfaceContentSecondary};
          `}
        >
          (&gt;{round(requiredSize * 100, 2)}% needed)
        </span>
      </div>
      <SummaryBar
        positiveSize={positiveSize}
        requiredSize={requiredSize}
        css={`
          margin-top: ${2 * GU}px;
        `}
      />
    </React.Fragment>
  )
}

function Status({ vote }) {
  const theme = useTheme()
  const network = useNetwork()
  const { endDate, executionDate, executionTransaction, open } = vote.data

  if (open) {
    return (
      <React.Fragment>
        <div
          css={`
            ${textStyle('body2')};
            color: ${theme.surfaceContentSecondary};
            margin-bottom: ${1 * GU}px;
          `}
        >
          Time remaining
        </div>
        <Timer end={endDate} maxUnits={4} />
      </React.Fragment>
    )
  }

  return (
    <React.Fragment>
      <VoteStatus vote={vote} />
      <div
        css={`
          margin-top: ${1 * GU}px;
          display: inline-grid;
          grid-auto-flow: column;
          grid-gap: ${1 * GU}px;
          align-items: center;
          color: ${theme.surfaceContentSecondary};
          ${textStyle('body2')};
        `}
      >
        <IconTime size="small" /> {formatDate(executionDate || endDate)}
      </div>
      {executionTransaction && (
        <div
          css={`
            margin-top: ${1 * GU}px;
          `}
        >
          <TransactionBadge
            networkType={network && network.type}
            transaction={executionTransaction}
          />
        </div>
      )}
    </React.Fragment>
  )
}

export default VoteInfoBoxes
