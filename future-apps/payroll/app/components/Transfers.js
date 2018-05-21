import React from 'react';
import styled from 'styled-components';
import { compareDesc } from 'date-fns/esm';
import { Button, Table, TableHeader, TableRow, DropDown, theme } from '@aragon/ui';
import { addressesEqual, toChecksumAddress } from '../web3-utils';
import TransferRow from './TransferRow';

const initialState = {
  selectedToken: 0,
  selectedTransferType: 0,
  displayedTransfers: 10
};

class Transfers extends React.Component {
  state = {
    ...initialState
  };
  componentDidMount() {
    this.setState({ selectedToken: 0 });
  }
  componentWillReceiveProps() {
    this.setState({ selectedToken: 0 });
  }
  handleTokenChange = index => {
    this.setState({ selectedToken: index, displayedTransfers: 10 });
  };

  handleResetFilters = () => {
    this.setState({
      ...initialState
    });
  };
  showMoreTransfers = () => {
    this.setState(prevState => ({
      displayedTransfers: prevState.displayedTransfers + 10
    }));
  };

  // Filter transfer based on the selected filters
  getFilteredTransfers({ tokens, transactions, selectedToken, selectedTransferType }) {
    return transactions.filter(
      ({ token, isIncoming }) => selectedToken === 0 || addressesEqual(token, tokens[selectedToken - 1].address)
    );
  }
  render() {
    const { displayedTransfers, selectedToken, selectedTransferType } = this.state;

    // const { transactions, tokens } = this.props

    const transactions = [
      {
        token: '0x00be01CAF657Ff277269f169bd5220A390f791f7',
        isIncoming: false,
        transactionHash: '0x09d846935dba964ebbdcba4cd51d51f43660ddb9c2c76b4f4a0c354619978bc5',
        amount: 3.4747,
        date: 1460714400,
        decimals: 4,
        entity: 'none',
        isIncoming: false,
        reference: 'none',
        symbol: 'EHT'
      },
      {
        token: '0x00be01CAF657Ff277269f169bd5220A390f791f7',
        isIncoming: false,
        transactionHash: '0x09d846935dba964ebbdcba4cd51d51f43660ddb9c2c76b4f4a0c354619978bc5',
        amount: 3.4747,
        date: 1460714400,
        decimals: 4,
        entity: 'none',
        isIncoming: false,
        reference: 'none',
        symbol: 'EHT'
      },
      {
        token: '0x00be01CAF657Ff277269f169bd5220A390f791f7',
        isIncoming: false,
        transactionHash: '0x09d846935dba964ebbdcba4cd51d51f43660ddb9c2c76b4f4a0c354619978bc5',
        amount: 3.4747,
        date: 1460714400,
        decimals: 4,
        entity: 'none',
        isIncoming: false,
        reference: 'none',
        symbol: 'EHT'
      }
    ];

    const tokens = [{ symobl: 'ETH', decimals: 5, address: '0x00be01CAF657Ff277269f169bd5220A390f791f7' }];

    const filteredTransfers = this.getFilteredTransfers({
      tokens,
      transactions,
      selectedToken,
      selectedTransferType
    });
    const symbols = tokens.map(({ symbol }) => symbol);

    const tokenDetails = tokens.reduce((details, { address, decimals, symbol }) => {
      details[toChecksumAddress(address)] = {
        decimals,
        symbol
      };
      return details;
    }, {});
    const filtersActive = selectedToken !== 0 || selectedTransferType !== 0;
    return (
      <section>
        <Header>
          <Title>Previous salary</Title>
          <div>
            <label>
              <Label>Date Range:</Label>
              <DropDown />
            </label>
            <label>
              <Label>Token:</Label>
              <DropDown items={['All', ...symbols]} active={selectedToken} onChange={this.handleTokenChange} />
            </label>
          </div>
        </Header>
        {filteredTransfers.length === 0 ? (
          <NoTransfers>
            <p>
              No transfers found.{' '}
              {filtersActive && (
                <a role="button" onClick={this.handleResetFilters}>
                  Reset filters
                </a>
              )}
            </p>
          </NoTransfers>
        ) : (
          <div>
            <FixedTable
              header={
                <TableRow>
                  <DateHeader title="Date" />
                  <SourceRecipientHeader title="Source / Recipient" />
                  <ReferenceHeader title="Reference" />
                  <AmountHeader title="Amount" align="right" />
                  <TableHeader />
                </TableRow>
              }
            >
              {filteredTransfers
                .slice(0, displayedTransfers)
                .sort(({ date: dateLeft }, { date: dateRight }) =>
                  // Sort by date descending
                  compareDesc(dateLeft, dateRight)
                )
                .map(transfer => (
                  <TransferRow
                    key={transfer.transactionHash}
                    {...tokenDetails[toChecksumAddress(transfer.token)]}
                    {...transfer}
                  />
                ))}
            </FixedTable>
            {displayedTransfers < filteredTransfers.length && (
              <Footer>
                <Button mode="secondary" onClick={this.showMoreTransfers}>
                  Show Older Transfers
                </Button>
              </Footer>
            )}
          </div>
        )}
      </section>
    );
  }
}

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const Title = styled.h1`
  margin-top: 10px;
  margin-bottom: 20px;
  font-weight: 600;
`;

const Label = styled.span`
  margin-right: 15px;
  margin-left: 20px;
  font-variant: small-caps;
  text-transform: lowercase;
  color: ${theme.textSecondary};
  font-weight: 600;
`;

const NoTransfers = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  background: ${theme.contentBackground};
  border: 1px solid ${theme.contentBorder};
  border-radius: 3px;
  a {
    text-decoration: underline;
    color: ${theme.accent};
    cursor: pointer;
  }
`;

const FixedTable = styled(Table)`
  color: rgba(0, 0, 0, 0.75);
`;

const DateHeader = styled(TableHeader)`
  width: 12%;
`;
const SourceRecipientHeader = styled(TableHeader)`
  width: 40%;
`;
const ReferenceHeader = styled(TableHeader)`
  width: 100%;
`;
const AmountHeader = styled(TableHeader)`
  width: 0;
`;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 30px;
`;

export default Transfers;
