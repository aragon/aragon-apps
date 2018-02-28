import React from 'react'
import styled from 'styled-components'
import { Table, TableHeader, TableRow } from '@aragon/ui'
import HolderRow from '../components/HolderRow'
import SideBar from '../components/SideBar'

class Holders extends React.Component {
  static defaultProps = {
    holders: [],
  }
  static TwoPanels = styled.div`
    display: flex;
    width: 100%;
    min-width: 800px;
  `
  static Main = styled.div`
    width: 100%;
  `
  render() {
    const { holders, tokenSupply } = this.props
    const Self = this.constructor
    const groupMode =
      holders.length > 0 &&
      holders[0].balance > 0 &&
      holders.every(({ balance }) => balance === holders[0].balance)
    return (
      <Self.TwoPanels>
        <Self.Main>
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
              />
            ))}
          </Table>
        </Self.Main>
        <SideBar
          holders={holders}
          tokenSupply={tokenSupply}
          groupMode={groupMode}
        />
      </Self.TwoPanels>
    )
  }
}

export default Holders
