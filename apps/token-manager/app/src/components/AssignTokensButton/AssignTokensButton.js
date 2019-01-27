import React from 'react'
import styled from 'styled-components'
import { theme, Button, ButtonIcon } from '@aragon/ui'
import { WindowSize } from '../../WindowSizeProvider'
import Icon from './Icon'

export default props => (
  <WindowSize>
    {({ fromMedium }) =>
      fromMedium ? (
        <Button mode="strong" {...props}>
          Assign Tokens
        </Button>
      ) : (
        <ButtonIcon {...props}>
          <Icon />
        </ButtonIcon>
      )
    }
  </WindowSize>
)
