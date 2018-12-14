import React from 'react'
import styled from 'styled-components'
import { TabBar, Table, TableHeader, TableRow, breakpoint } from '@aragon/ui'
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
      <TwoPanels>
        <Main>
          <ResponsiveTabBar>
            <TabBar
              items={TABS}
              selected={selectedTab}
              onSelect={this.handleSelectTab}
            />
          </ResponsiveTabBar>
          <ResponsiveTable
            selected={selectedTab === 0}
            header={
              <TableRow>
                <StyledTableHeader title={groupMode ? 'Owner' : 'Holder'} />
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
        </Main>
        <ResponsiveSideBar
          selected={selectedTab === 1}
          groupMode={groupMode}
          holders={holders}
          tokenAddress={tokenAddress}
          tokenDecimalsBase={tokenDecimalsBase}
          tokenName={tokenName}
          tokenSupply={tokenSupply}
          tokenSymbol={tokenSymbol}
          tokenTransfersEnabled={tokenTransfersEnabled}
        />
      </TwoPanels>
    )
  }

  handleSelectTab = index => {
    this.setState({ selectedTab: index })
  }
}

const StyledTableHeader = styled(TableHeader)`
  width: 50%;

  ${breakpoint(
    'medium',
    `
      width: auto;
    `,
  )};
`

const ResponsiveTabBar = styled.div`
  margin-top: 16px;

  & ul {
    border-bottom: none !important;
  }
  & li {
    padding: 0 20px;
  }

  ${breakpoint('medium', `display: none`)};
`

const ResponsiveTable = styled(Table)`
  display: ${({ selected }) => (selected ? 'block' : 'none')};
  margin-top: 16px;

  ${breakpoint(
    'medium',
    `
      display: table;
      margin-top: 0;
    `,
  )};
`

const ResponsiveSideBar = styled(SideBar)`
  display: ${({ selected }) => (selected ? 'block' : 'none')};
  margin-top: 16px;

  ${breakpoint(
    'medium',
    `
      display: block;
      margin-top: 0;
    `,
  )};
`

const Main = styled.div`
  max-width: 100%;

  ${breakpoint(
    'medium',
    `
      width: 100%;
    `,
  )};
`
const TwoPanels = styled.div`
  width: 100%;

  ${breakpoint(
    'medium',
    `
      min-width: 800px;
      display: flex;
    `,
  )};
`

export default Holders
