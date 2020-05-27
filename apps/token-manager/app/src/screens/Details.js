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
import { format, formatDistanceStrict, parseISO } from 'date-fns'
import { useAppState } from '@aragon/api-react'
import EmptyVestings from '../components/Vestings/EmptyVestings'
import ExpandableContent from '../components/Vestings/VestingExpandableContent'
import VestingContent from '../components/Vestings/VestingContent'
import VestingInfoBoxes from '../components/Vestings/VestingInfoBoxes'
import { useAppLogic, toISODate, useVestedTokensInfo } from '../app-logic'

function Details({ tokenSymbol, tokenDecimals }) {
  const theme = useTheme()
  const { selectedHolder, selectHolder, unselectHolder } = useAppLogic()
  const handleBack = useCallback(() => unselectHolder(), [unselectHolder])

  return (
    selectedHolder && (
      <React.Fragment>
        <Bar>
          <BackButton onClick={handleBack} />
        </Bar>
        <Split
          primary={
            selectedHolder.vestings ? (
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
            ) : (
              <Box>
                <EmptyVestings />
              </Box>
            )
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
  )
}

export default Details
