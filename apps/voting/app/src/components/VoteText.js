import React from 'react'
import PropTypes from 'prop-types'
import { transformAddresses } from '../web3-utils'
import AutoLink from '../components/AutoLink'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'

// Render a text associated to a vote.
// Usually vote.data.metadata and vote.data.description.
const VoteText = React.memo(
  ({ text = '' }) => {
    // If there is no text, the component doesn’t render anything.
    if (!text.trim()) {
      return null
    }

    return (
      <AutoLink>
        {text.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {transformAddresses(line, (part, isAddress, index) =>
              isAddress ? (
                <span title={part} key={index}>
                  {' '}
                  <LocalIdentityBadge entity={part} compact />{' '}
                </span>
              ) : (
                <span key={index}>{part}</span>
              )
            )}
            <br />
          </React.Fragment>
        ))}
      </AutoLink>
    )
  },
  (prevProps, nextProps) => prevProps.text === nextProps.text
)

VoteText.propTypes = {
  text: PropTypes.string,
}

export default VoteText
