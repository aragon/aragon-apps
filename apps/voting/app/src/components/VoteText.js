import React from 'react'
import PropTypes from 'prop-types'
import { transformAddresses } from '../web3-utils'
import AutoLink from '../components/AutoLink'
import LocalIdentityBadge from '../components/LocalIdentityBadge/LocalIdentityBadge'

// Render a text associated to a vote.
// Usually vote.data.metadata and vote.data.description.
const VoteText = React.memo(
  function VoteText({ disabled, text, prefix, ...props }) {
    // If there is no text, the component doesn’t render anything.
    if (!text.trim()) {
      return null
    }

    const TextComponent = disabled ? 'span' : AutoLink

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
        <TextComponent>
          {text.split('\n').map((line, i) => (
            <React.Fragment key={i}>
              {i > 0 && <br />}
              {transformAddresses(line, (part, isAddress, index) =>
                isAddress ? (
                  <span title={part} key={index}>
                    {' '}
                    <LocalIdentityBadge
                      badgeOnly={disabled}
                      compact
                      entity={part}
                    />{' '}
                  </span>
                ) : (
                  <span key={index}>{part}</span>
                )
              )}
            </React.Fragment>
          ))}
        </TextComponent>
      </div>
    )
  },
  (prevProps, nextProps) => prevProps.text === nextProps.text
)

VoteText.propTypes = {
  disabled: PropTypes.bool,
  text: PropTypes.string,
  prefix: PropTypes.node,
}

VoteText.defaultProps = {
  text: '',
}

export default VoteText
