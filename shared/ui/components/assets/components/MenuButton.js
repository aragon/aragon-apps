import React from 'react'
import styled from 'styled-components'
import { ButtonIcon, IconMenu } from '@aragon/ui'

const StyledButton = styled(ButtonIcon)`
  margin-right: 18px;
  width: auto;
`

export default props => (
  <StyledButton
    {...props}
    onClick={() => {
      window.parent.postMessage(
        { from: 'app', name: 'menuPanel', value: true },
        '*'
      )
    }}
    label="Menu"
  >
    <IconMenu />
  </StyledButton>
)
