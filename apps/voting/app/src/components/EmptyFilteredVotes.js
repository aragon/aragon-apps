import React from 'react'
import PropTypes from 'prop-types'
import { Box, Link, GU, unselectable, useTheme } from '@aragon/ui'
import noResultsPng from '../assets/no-results.png'

function EmptyFilteredVotes({ onClear }) {
  const theme = useTheme()

  return (
    <Box>
      <div
        css={`
          margin-top: ${4 * GU}px;
          display: flex;
          flex-direction: column;
          align-items: center;
          ${unselectable};
        `}
      >
        <img
          css={`
            margin: ${4 * GU}px 0;
            height: 176px;
          `}
          src={noResultsPng}
          alt="No results"
        />
        <h3
          css={`
            font-size: 28px;
            color: ${theme.content};
          `}
        >
          No results found.
        </h3>
        <div
          css={`
            max-width: 270px;
            text-align: center;
            margin-top: ${1 * GU}px;
            margin-bottom: ${4 * GU}px;
            color: ${theme.surfaceContentSecondary};
            font-size: 16px;
          `}
        >
          We can’t find any item matching your filter selection.{' '}
          <Link onClick={onClear}>Clear filters</Link>
        </div>
      </div>
    </Box>
  )
}

EmptyFilteredVotes.propTypes = {
  onClear: PropTypes.func.isRequired,
}

export default React.memo(EmptyFilteredVotes)
