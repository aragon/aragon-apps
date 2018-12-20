import React from 'react'
import styled from 'styled-components'
import { Spring, animated } from 'react-spring'
import {
  TabBar,
  Table,
  TableHeader,
  TableRow,
  breakpoint,
  BreakPoint,
  springs,
} from '@aragon/ui'
import HolderRow from '../components/HolderRow'
import SideBar from '../components/SideBar'

const TABS = ['Holders', 'Token Info']

class Holders extends React.Component {
  state = { selectedTab: 0 }

  static defaultProps = {
    holders: [],
    offset: 0,
  }
  render() {
    const {
      groupMode,
      holders,
      maxAccountTokens,
      onAssignTokens,
      offset,
      onRemoveTokens,
      tabbedNavigation,
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
          <Screen
            Component={ResponsiveTable}
            selected={!tabbedNavigation || selectedTab === 0}
            offset={-offset}
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
          </Screen>
        </Main>
        <Screen
          Component={ResponsiveSideBar}
          selected={!tabbedNavigation || selectedTab === 1}
          offset={offset}
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

const Screen = ({
  offset,
  children,
  Component,
  selected,
  ...props
}) => {
  return (
    <Spring
      from={{ progress: 0 }}
      to={{ progress: !!selected }}
      config={springs.clamp}
      native
    >
      {({ progress }) =>
        selected && (
          <AnimatedDiv
            style={{
              opacity: progress,
              transform: progress.interpolate(
                v => `translate3d(${offset - v * offset}px, 0, 0)`
              ),
            }}
          >
            <Component {...props} children={children} />
          </AnimatedDiv>
        )
      }
    </Spring>
  )
}

const AnimatedDiv = styled(animated.div)`
  position: relative;
`

const StyledTableHeader = styled(TableHeader)`
  width: ${({ groupmode }) => (groupmode ? 100 : 50)}%;

  ${breakpoint(
    'medium',
    `
      width: auto;
    `
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
      min-width: 800px;
      display: flex;
    `
  )};
`

export default props => (
  <React.Fragment>
    <BreakPoint to="medium">
      <Holders {...props} tabbedNavigation offset={50} />
    </BreakPoint>
    <BreakPoint from="medium">
      <Holders {...props} />
    </BreakPoint>
  </React.Fragment>
)
