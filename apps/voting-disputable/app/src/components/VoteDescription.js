import React from 'react'
import PropTypes from 'prop-types'
import AutoLink from '../components/AutoLink'

// Render a description associated to a vote.
// Usually vote.data.metadata and vote.data.description.
const VoteDescription = React.memo(function VoteDescription({
  disabled,
  description,
  prefix,
  ...props
}) {
  // If there is no description, the component doesn’t render anything.
  if (!description) {
    return null
  }

  return (
    <div
      {...props}
      css={`
        // overflow-wrap:anywhere and hyphens:auto are not supported yet by
        // the latest versions of Safari (as of June 2020), which
        // is why word-break:break-word has been added here.
        hyphens: auto;
        overflow-wrap: anywhere;
        word-break: break-word;
      `}
    >
      {prefix}
      {disabled ? (
        <span>{description}</span>
      ) : (
        <AutoLink>
          <span>{description}</span>
        </AutoLink>
      )}
    </div>
  )
})

VoteDescription.propTypes = {
  description: PropTypes.node,
  disabled: PropTypes.bool,
  prefix: PropTypes.node,
}

VoteDescription.defaultProps = {
  description: '',
}

export default VoteDescription
