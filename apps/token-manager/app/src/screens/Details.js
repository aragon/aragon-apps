import React, { useCallback } from 'react'
import { Accordion, Bar, BackButton, Box, Split } from '@aragon/ui'
import EmptyVestings from '../components/Vestings/EmptyVestings'
import VestingContent from '../components/Vestings/VestingContent'
import VestingExpandableContent from '../components/Vestings/VestingExpandableContent'
import VestingInfoBoxes from '../components/Vestings/VestingInfoBoxes'
import { useAppLogic } from '../app-logic'

function Details({ tokenSymbol, tokenDecimals }) {
  const { selectedHolder, unselectHolder } = useAppLogic()
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
                    <VestingExpandableContent
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
