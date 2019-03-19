import React from 'react'
import styled from 'styled-components'
import {
  TabBar,
  Table,
  TableHeader,
  TableRow,
  Viewport,
  breakpoint,
} from '@aragon/ui'
import HolderRow from '../components/HolderRow'
import SideBar from '../components/SideBar'

const TABS = ['Holders', 'Token Info']

class Holders extends React.Component {
  state = { selectedTab: 0 }

  static defaultProps = {
    holders: [],
  }
  render() {
    const {
      groupMode,
      holders,
      maxAccountTokens,
      onAssignTokens,
      onRemoveTokens,
      tokenAddress,
      tokenDecimalsBase,
      tokenName,
      tokenSupply,
      tokenSymbol,
      tokenTransfersEnabled,
      userAccount,
    } = this.props
    const { selectedTab } = this.state

    return (
      <Viewport>
        {({ below }) => {
          const tabbedNavigation = below('medium')

          return (
            <TwoPanels>
              <Main>
                {tabbedNavigation && (
                  <TabBarWrapper>
                    <TabBar
                      items={TABS}
                      selected={selectedTab}
                      onSelect={this.handleSelectTab}
                    />
                  </TabBarWrapper>
                )}
                <Screen selected={!tabbedNavigation || selectedTab === 0}>
                  <ResponsiveTable
                    header={
                      <TableRow>
                        <StyledTableHeader
                          title={groupMode ? 'Owner' : 'Holder'}
                          groupmode={groupMode}
                        />
                        {!groupMode && (
                          <StyledTableHeader title="Balance" align="right" />
                        )}
                        <TableHeader title="" />
                      </TableRow>
                    }
                  >
                    {holders.map(({ address, balance }) => (
                      <HolderRow
                        key={address}
                        address={address}
                        balance={balance}
                        groupMode={groupMode}
                        isCurrentUser={userAccount && userAccount === address}
                        maxAccountTokens={maxAccountTokens}
                        tokenDecimalsBase={tokenDecimalsBase}
                        onAssignTokens={onAssignTokens}
                        onRemoveTokens={onRemoveTokens}
                      />
                    ))}
                  </ResponsiveTable>
                </Screen>
              </Main>
              <Screen selected={!tabbedNavigation || selectedTab === 1}>
                <ResponsiveSideBar
                  groupMode={groupMode}
                  holders={holders}
                  tokenAddress={tokenAddress}
                  tokenDecimalsBase={tokenDecimalsBase}
                  tokenName={tokenName}
                  tokenSupply={tokenSupply}
                  tokenSymbol={tokenSymbol}
                  tokenTransfersEnabled={tokenTransfersEnabled}
                />
              </Screen>
            </TwoPanels>
          )
        }}
      </Viewport>
    )
  }

  handleSelectTab = index => {
    this.setState({ selectedTab: index })
  }
}

const Screen = ({ selected, children }) => selected && children

const StyledTableHeader = styled(TableHeader)`
  width: ${({ groupmode }) => (groupmode ? 100 : 50)}%;

  ${breakpoint(
    'medium',
    `
      width: auto;
    `
  )};
`

const TabBarWrapper = styled.div`
  margin-top: 16px;
  & ul {
    border-bottom: none !important;
  }
  & li {
    padding: 0 20px;
  }
`

const ResponsiveTable = styled(Table)`
  margin-top: 16px;

  ${breakpoint(
    'medium',
    `
      opacity: 1;
      margin-top: 0;
    `
  )};
`

const ResponsiveSideBar = styled(SideBar)`
  margin-top: 16px;

  ${breakpoint(
    'medium',
    `
      opacity: 1;
      margin-top: 0;
    `
  )};
`

const Main = styled.div`
  max-width: 100%;

  ${breakpoint(
    'medium',
    `
      width: 100%;
    `
  )};
`
const TwoPanels = styled.div`
  width: 100%;

  ${breakpoint(
    'medium',
    `
      display: flex;
    `
  )};
`

export default Holders
