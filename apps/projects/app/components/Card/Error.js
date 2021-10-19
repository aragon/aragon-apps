import React from 'react'
import PropTypes from 'prop-types'
import { EmptyStateCard } from '@aragon/ui'
import { EmptyWrapper } from '../Shared'

const ExplodingHeadEmoji = () => (
  <p style={{ 'font-size': '70px', 'line-height': '35px' }}>
    <span role="img" aria-label="oh no!">
      🤯
    </span>
  </p>
)

const Error = ({ action }) => (
  <EmptyWrapper>
    <EmptyStateCard
      title="Failed attempt at connecting to your GitHub."
      text="Please refresh your page and try again."
      icon={<ExplodingHeadEmoji />}
      onActivate={action}
    />
  </EmptyWrapper>
)

Error.propTypes = {
  action: PropTypes.func.isRequired,
}

export default Error
