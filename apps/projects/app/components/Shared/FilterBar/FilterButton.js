import React from 'react'
import PropTypes from 'prop-types'
import { useTheme } from '@aragon/ui'

const FilterButton = ({ width, children, onClick, disabled }) => {
  const theme = useTheme()

  return (
    <button
      css={`
        display: inline-flex;
        -webkit-box-align: center;
        -ms-flex-align: center;
        align-items: center;
        -webkit-box-pack: center;
        justify-content: center;
        width: ${width};
        height: 40px;
        padding: 0;
        user-select: none;
        background: ${theme.surface};
        color: ${theme.surfaceContent};
        white-space: nowrap;
        border: 1px solid ${theme.border};
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        transition-property: transform,box-shadow;
        transition-duration: 50ms;
        transition-timing-function: ease-in-out;
        border-radius: 3px;
        :hover, :focus, :active {
          outline: none;
          box-shadow: 0 0 8px 4px rgba(0, 0, 0, 0.06);
        }
      `}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
FilterButton.propTypes = {
  width: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
}

export default FilterButton
