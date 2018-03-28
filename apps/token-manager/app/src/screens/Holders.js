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
      tokenDecimalsBase,
      tokenSupply,
    } = this.props
    const singleHolder =
      // We assume that a token is liquid if a single holder has more than one token
      holders.length === 1 && holders[0].balance !== 1 * tokenDecimalsBase
    const sameBalances =
      holders.length > 0 &&
      holders[0].balance > 0 &&
      holders.every(({ balance }) => balance === holders[0].balance)
    // Be in group mode if everyone has the same balances, unless there's only one token holder
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
                name={address}
                balance={balance}
                groupMode={groupMode}
                onAssignTokens={onAssignTokens}
                tokenDecimalsBase={tokenDecimalsBase}
              />
            ))}
          </Table>
        </Main>
        <SideBar
          groupMode={groupMode}
          holders={holders}
          tokenDecimalsBase={tokenDecimalsBase}
          tokenSupply={tokenSupply}
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
