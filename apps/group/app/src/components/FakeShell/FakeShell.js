import React from 'react'
import styled from 'styled-components'
import { AragonApp, Button, DropDown, Text, publicUrlInjector, theme } from '@aragon/ui'
import { OverlayPanel } from '..'

import chevron from './assets/chevron.svg'

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
  justify-content: space-between;
  height: 64px;
  background: ${theme.contentBackground};
  border-bottom: 1px solid ${theme.contentBorder};
`

const TopBarStart = styled.div`
  display: flex;
  align-items: center;
  padding-left: 30px;
`
const TopBarEnd = styled.div`
  padding-right: 30px;
`

const TopBarTitle = styled.h1`
  padding-right: 20px;
  margin-right: 20px;
  background: url(${chevron}) no-repeat 100% 50%;
`

const TopBarEndButton = styled(Button)`
  width: 150px;
`

class FakeShell extends React.Component {
  render() {
    const {
      children,
      title,
      panel,
      panelTitle,
      panelOpened,
      onPanelClose,
      groups,
      activeGroupIndex,
      onChangeGroup,
      onAdd,
    } = this.props
    return (
      <StyledFakeShell>
        <ShellContent>
          <Menu>Menu</Menu>
          <AppContext>
            <TopBar>
              <TopBarStart>
                <TopBarTitle>
                  <Text size="xxlarge">{title}</Text>
                </TopBarTitle>
                <div>
                  <DropDown
                    items={groups.map(group => group.name)}
                    active={activeGroupIndex}
                    onChange={onChangeGroup}
                  />
                </div>
              </TopBarStart>
              <TopBarEnd>
                <TopBarEndButton mode="strong" onClick={onAdd}>
                  Add
                </TopBarEndButton>
              </TopBarEnd>
            </TopBar>
            <div>{children}</div>
          </AppContext>
        </ShellContent>
        <OverlayPanel
          title={panelTitle}
          opened={panelOpened}
          onClose={onPanelClose}
        >
          {panel}
        </OverlayPanel>
      </StyledFakeShell>
    )
  }
}

export default publicUrlInjector(FakeShell)
