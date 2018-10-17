import React from 'react'
import styled from 'styled-components'
import { Table, TableHeader, TableRow } from '@aragon/ui'
import HolderRow from '../components/HolderRow'
import SideBar from '../components/SideBar'

class Holders extends React.Component {
  static defaultProps = {
    holders: [],
  }
  render() {
    const {
      holders,
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

    // We assume that a token is liquid if a single holder
    // has more than one token.
    const singleHolder =
      holders.length === 1 && !holders[0].balance.eq(tokenDecimalsBase)

    const sameBalances =
      holders.length > 0 &&
      holders[0].balance.gt(0) &&
      holders.every(({ balance }) => balance.eq(holders[0].balance))

    // Be in group mode if everyone has the same balances,
    // unless there's only one token holder.
    const groupMode = sameBalances && !singleHolder

    return (
      <TwoPanels>
        <Main>
          <Table
            header={
              <TableRow>
                <TableHeader title={groupMode ? 'Owner' : 'Holder'} />
                {!groupMode && <TableHeader title="Balance" align="right" />}
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
                tokenDecimalsBase={tokenDecimalsBase}
                isCurrentUser={userAccount && userAccount === address}
                onAssignTokens={onAssignTokens}
                onRemoveTokens={onRemoveTokens}
              />
            ))}
          </Table>
        </Main>
        <SideBar
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
}

const Main = styled.div`
  width: 100%;
`
const TwoPanels = styled.div`
  display: flex;
  width: 100%;
  min-width: 800px;
`

export default Holders
