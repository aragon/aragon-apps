import React from 'react'
import PropTypes from 'prop-types'
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
  static propTypes = {
    holders: PropTypes.array,
  }
  static defaultProps = {
    holders: [],
  }
  state = { selectedTab: 0 }
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
          const compactTable = below('medium')

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
                {(!tabbedNavigation || selectedTab === 0) && (
                  <ResponsiveTable
                    header={
                      <TableRow>
                        <TableHeader
                          title={groupMode ? 'Owner' : 'Holder'}
                          groupmode={groupMode}
                          colSpan={groupMode ? '2' : '1'}
                        />
                        {!groupMode && (
                          <TableHeader
                            title="Balance"
                            align={compactTable ? 'left' : 'right'}
                            colSpan={compactTable ? '2' : '1'}
                          />
                        )}
                        {!groupMode && !compactTable && <TableHeader />}
                      </TableRow>
                    }
                    noSideBorders={compactTable}
                  >
                    {holders.map(({ address, balance }) => (
                      <HolderRow
                        key={address}
                        address={address}
                        balance={balance}
                        groupMode={groupMode}
                        isCurrentUser={Boolean(
                          userAccount && userAccount === address
                        )}
                        maxAccountTokens={maxAccountTokens}
                        tokenDecimalsBase={tokenDecimalsBase}
                        onAssignTokens={onAssignTokens}
                        onRemoveTokens={onRemoveTokens}
                        compact={compactTable}
                      />
                    ))}
                  </ResponsiveTable>
                )}
              </Main>
              {(!tabbedNavigation || selectedTab === 1) && (
                <SideBar
                  holders={holders}
                  tokenAddress={tokenAddress}
                  tokenDecimalsBase={tokenDecimalsBase}
                  tokenName={tokenName}
                  tokenSupply={tokenSupply}
                  tokenSymbol={tokenSymbol}
                  tokenTransfersEnabled={tokenTransfersEnabled}
                  userAccount={userAccount}
                />
              )}
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
