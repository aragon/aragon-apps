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
                isCurrentUser={userAccount && userAccount === address}
                maxAccountTokens={maxAccountTokens}
                tokenDecimalsBase={tokenDecimalsBase}
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
