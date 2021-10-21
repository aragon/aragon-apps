import React from 'react'
import PropTypes from 'prop-types'
import { useTheme } from '@aragon/ui'

import IconX from '../Shared/assets/components/IconX'

const FilterTile = ({ text, disableFilter }) => {
  const theme = useTheme()

  return (
    <div css={`
      display: inline-flex;
      margin: 1px 4px 1px 0;
      font-weight: 600;
      border-radius: 3px;
      font-size: 12px;
      line-height: 1.5;
      display: flex;
      padding: 4px 4px 2px 10px;
      white-space: nowrap;
      background: ${theme.controlBorder};
      color: ${theme.surfaceContentSecondary};
    `}>
      {text}
      <button onClick={disableFilter} css={`
        background: none;
        border: none;
        cursor: pointer;
        font: inherit;
        outline: none;
        padding: 0 4px 0 10px;
        :hover, :focus, :active {
          polygon, rect {
            fill: ${theme.negative};
          }
        }
      `}>
        <IconX height="8px" width="8px" />
      </button>
    </div>
  )
}

FilterTile.propTypes = {
  text: PropTypes.string.isRequired,
  disableFilter: PropTypes.func.isRequired,
}

export default FilterTile