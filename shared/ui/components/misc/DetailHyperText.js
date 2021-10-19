import React from 'react'
import PropTypes from 'prop-types'
import Markdown from 'react-markdown'
import { Link } from '@aragon/ui'

const InlineLink = ({ href, children }) => (
  <Link
    href={href}
    css={`
      white-space: normal;
      word-break: break-all;
      display: inline
    `}>
    {children}
  </Link>
)

InlineLink.propTypes = {
  href: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}

const DetailHyperText = ({ children }) => {
  return (
    <div css={'margin-bottom: 10px'}>
      <Markdown
        renderers={{ link: InlineLink }}
        escapeHtml={true}
      >
        {children}
      </Markdown>
    </div>
  )
}

DetailHyperText.propTypes = {
  children: PropTypes.node.isRequired,
}

export default DetailHyperText
