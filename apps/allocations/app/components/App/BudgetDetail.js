import React from 'react'
import PropTypes from 'prop-types'
import BigNumber from 'bignumber.js'
import styled from 'styled-components'
import { useAragonApi } from '../../api-react'
import {
  BREAKPOINTS,
  BackButton,
  Bar,
  Box,
  Button,
  GU,
  Header,
  IconPlus,
  ProgressBar,
  Text,
  textStyle,
  useTheme,
} from '@aragon/ui'

import { usePanel } from '../../context/Panel'
import usePathHelpers from '../../hooks/usePathHelpers'
import usePeriod from '../../hooks/usePeriod'
import { AllocationsHistory } from '.'
import InfoBlock from './InfoBlock'
import BudgetContextMenu from '../BudgetContextMenu'
import { formatDate } from '../../utils/helpers'
import * as types from '../../utils/prop-types'

const percentOf = (smaller, bigger) =>
  `${BigNumber(100 * smaller / bigger).dp(1).toString()}%`

const displayCurrency = (amount, decimals) => {
  return BigNumber(amount)
    .div(10 ** decimals)
    .dp(3)
    .toNumber()
    .toLocaleString()
}

const Grid = styled.div`
  display: grid;
  grid-gap: ${2 * GU}px;
  grid-template-areas:
    "main"
    "budget"
    ${p => p.active && '"period"'}
    "allocations";

  @media (min-width: ${BREAKPOINTS.large}px) {
    grid-template-columns: 3fr 1fr;
    grid-template-rows: repeat(3, auto);
    grid-template-areas:
      "main budget"
      "main period"
      "allocations period";
  }
`

export default function BudgetDetail({ budget }) {
  const { appState } = useAragonApi()
  const { requestPath } = usePathHelpers()
  const { newAllocation } = usePanel()
  const period = usePeriod()
  const theme = useTheme()

  const allocations = (appState.allocations || [])
    .filter(a => a.accountId === budget.id)
  const utilized = budget.amount - budget.remaining
  return (
    <>
      <Header
        primary="Allocations"
        secondary={budget.active && (
          <Button
            mode="strong"
            icon={<IconPlus />}
            onClick={() => newAllocation(budget.id)}
            label="New allocation"
          />
        )}
      />
      <Bar>
        <BackButton onClick={() => requestPath('/')} />
      </Bar>
      <Grid active={budget.active}>
        <div css="grid-area: main">
          <Box heading="Budget">
            <div css="display: flex; justify-content: space-between">
              <Text size="great" style={{ marginBottom: 2 * GU + 'px' }}>
                {budget.name}
              </Text>
              <BudgetContextMenu budget={budget} />
            </div>
            {budget.active && (
              <>
                <div css="display: flex">
                  <InfoBlock
                    style={{ flex: 1 }}
                    title="Budget"
                    large={displayCurrency(budget.amount, budget.token.decimals)}
                    small={budget.token.symbol}
                    context="per 30 days"
                  />
                  <InfoBlock
                    style={{ flex: 1 }}
                    title="Utilized"
                    large={displayCurrency(utilized, budget.token.decimals)}
                    small={budget.token.symbol}
                    context={percentOf(utilized, budget.amount)}
                  />
                  <InfoBlock
                    style={{ flex: 1 }}
                    title="Remaining"
                    large={displayCurrency(budget.remaining, budget.token.decimals)}
                    small={budget.token.symbol}
                    context={percentOf(budget.remaining, budget.amount)}
                  />
                </div>
                <div css={`margin-top: ${3 * GU}px; margin-bottom: ${GU}px`}>
                  <ProgressBar
                    color={String(theme.accentEnd)}
                    value={utilized / budget.amount}
                  />
                </div>
              </>
            )}
          </Box>
        </div>
        <div css="grid-area: budget">
          <Box
            css="margin-top: 0 !important"
            heading="Budget info"
          >
            <InfoBlock
              title="Budget ID"
              medium={'#'+budget.id}
            />
          </Box>
        </div>
        {budget.active && (
          <div css="grid-area: period">
            <Box
              css="margin-top: 0 !important"
              heading="Period info"
            >
              <InfoBlock
                title="Start Date"
                medium={formatDate({ date: period.startDate })}
              />
              <InfoBlock
                style={{ marginTop: `${2 * GU}px` }}
                title="End Date"
                medium={formatDate({ date: period.endDate })}
              />
            </Box>
          </div>
        )}
        { !!allocations.length &&
          <div css="grid-area: allocations">
            <AllocationsHistory
              allocations={allocations}
              skipBudgetColumn
            />
          </div>
        }
      </Grid>
    </>
  )
}

BudgetDetail.propTypes = {
  budget: types.budget,
}
