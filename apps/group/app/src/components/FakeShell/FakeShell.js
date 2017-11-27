import React from 'react'
import styled from 'styled-components'
import { theme } from '@aragon/ui'

const StyledFakeShell = styled.div`
  min-height: 100vh;
`

const ShellContent = styled.div`
  display: flex;
  background: #987;
`

const Menu = styled.div`
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 220px;
  background: ${theme.contentBackground};
  box-shadow: 1px 0 15px ${theme.shadow};
  &:before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 64px;
    border-bottom: 1px solid ${theme.contentBorder};
  }
`

const AppContext = styled.div`
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  background: #777;
`

class FakeShell extends React.Component {
  render() {
    return (
      <StyledFakeShell>
        <ShellContent>
          <Menu>Menu</Menu>
          <AppContext>
            {this.props.children}
          </AppContext>
        </ShellContent>
      </StyledFakeShell>
    )
  }
}

export default FakeShell
