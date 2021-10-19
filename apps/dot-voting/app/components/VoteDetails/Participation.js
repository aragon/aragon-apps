import React from 'react'
import PropTypes from 'prop-types'
import { Spring, config as springs } from 'react-spring'
import { useAragonApi } from '../../api-react'
import { Box, GU, Text, useTheme } from '@aragon/ui'
import VotingOption from '../VotingOption'

const Participation = ({ vote }) => {
  const theme = useTheme()
  const { appState: { globalMinQuorum = 0 } } = useAragonApi()
  const minQuorum = globalMinQuorum / 10 ** 16
  return (
    <Box heading="Participation" padding={0}>
      <div css={`padding: ${2 * GU}px ${3 * GU}px ${3 * GU}px ${3 * GU}px`}>
        <div css="margin-bottom: 10px">
          {Math.round(vote.data.participationPct)}%{' '}
          <Text size="small" color={`${theme.surfaceContentSecondary}`}>
            ({minQuorum}% needed)
          </Text>
        </div>

        <Spring
          delay={500}
          config={springs.stiff}
          from={{ value: 0 }}
          to={{ value: vote.data.participationPct / 100 }}
          native
        >
          {({ value }) => (
            <VotingOption
              valueSpring={value}
              color={`${theme.positive}`}
              value={value}
              threshold={minQuorum}
            />
          )}
        </Spring>
      </div>
    </Box>
  )
}

Participation.propTypes = {
  vote: PropTypes.shape({
    data: PropTypes.shape({
      participationPct: PropTypes.number.isRequired,
    }),
  }).isRequired,
}

export default Participation
