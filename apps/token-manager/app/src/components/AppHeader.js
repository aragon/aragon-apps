import React from 'react'
import PropTypes from 'prop-types'
import {
  Button,
  Header,
  IconPlus,
  Tag,
  textStyle,
  useLayout,
  useTheme,
  GU,
} from '@aragon/ui'

const AppHeader = React.memo(function AppHeader({
  tokenSymbol,
  onAssignHolder,
}) {
  const theme = useTheme()
  const { layoutName } = useLayout()

  return (
    <Header
      primary={
        <div
          css={`
            display: flex;
            align-items: center;
            flex: 1 1 auto;
            width: 0;
          `}
        >
          <h1
            css={`
              ${textStyle(layoutName === 'small' ? 'title3' : 'title2')};
              flex: 0 1 auto;
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
              margin-right: ${1 * GU}px;
              color: ${theme.content};
            `}
          >
            Tokens
          </h1>
          <div css="flex-shrink: 0">
            {tokenSymbol && <Tag mode="identifier">{tokenSymbol}</Tag>}
          </div>
        </div>
      }
      secondary={
        <Button
          mode="strong"
          onClick={onAssignHolder}
          label="Add tokens"
          icon={<IconPlus />}
          display={layoutName === 'small' ? 'icon' : 'label'}
        />
      }
    />
  )
})
AppHeader.propTypes = {
  onAssignHolder: PropTypes.func.isRequired,
  tokenSymbol: PropTypes.string,
}

export default AppHeader
