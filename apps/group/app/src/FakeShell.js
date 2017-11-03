import React from 'react'
import styled from 'styled-components'
import { AragonApp, theme } from '@aragon/ui'

import { OverlayPanel } from './components'

const StyledFakeShell = styled.div`
  min-height: 100vh;
  ${AragonApp.Styled} {
    min-height: calc(100vh - 64px);
  }
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

const TopBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  height: 64px;
  background: ${theme.contentBackground};
  border-bottom: 1px solid ${theme.contentBorder};
`

const AppContent = styled.div`
`

class FakeShell extends React.Component {
  render() {
    const { children, panel, panelOpened, onPanelClose } = this.props
    return (
      <StyledFakeShell>
        <ShellContent>
          <Menu>Menu</Menu>
          <AppContext>
            <TopBar>Top bar</TopBar>
            <AppContent>{children}</AppContent>
          </AppContext>
        </ShellContent>
        <OverlayPanel opened={panelOpened} onClose={onPanelClose} />
      </StyledFakeShell>
    )
  }
}

export default FakeShell
