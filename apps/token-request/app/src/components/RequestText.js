import React from 'react'
import PropTypes from 'prop-types'
import { transformAddresses } from '../lib/web3-utils'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'

// Render a text associated to a vote.
// Usually vote.data.metadata and vote.data.description.
const RequestText = React.memo(
  function RequestText({ disabled, text, prefix, ...props }) {
    // If there is no text, the component doesn’t render anything.
    if (!text.trim()) {
      return null
    }

    return (
      <div
        {...props}
        css={`
          // overflow-wrap:anywhere and hyphens:auto are not supported yet by
          // the latest versions of Webkit / Blink (as of October 2019), which
          // is why word-break:break-word has been added here.
          hyphens: auto;
          overflow-wrap: anywhere;
          word-break: break-word;
        `}
      >
        {prefix}
        <span>
          {text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {transformAddresses(line, (part, isAddress, index) =>
                isAddress ? (
                  <span title={part} key={index}>
                    {' '}
                    <LocalIdentityBadge badgeOnly={disabled} compact entity={part} />{' '}
                  </span>
                ) : (
                  <span key={index}>{part}</span>
                )
              )}
            </React.Fragment>
          ))}
        </span>
      </div>
    )
  },
  (prevProps, nextProps) => prevProps.text === nextProps.text
)

RequestText.propTypes = {
  disabled: PropTypes.bool,
  text: PropTypes.string,
  prefix: PropTypes.node,
}

RequestText.defaultProps = {
  text: '',
}

export default RequestText
