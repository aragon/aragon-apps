import React from "react";
import styled from "styled-components";
import { compareDesc } from "date-fns/esm";
import { Button, Table, TableHeader, TableRow, DropDown, theme, IconTime } from "@aragon/ui";
import { addressesEqual, toChecksumAddress } from "../../web3-utils";
import EmployeeItem from "./EmployeeItem";

const initialState = {
  selectedToken: 0,
  selectedTransferType: 0,
  displayedTransfers: 10
};

class EmployeeList extends React.Component {
  state = {
    ...initialState,
    startDate: null,
    endDate: null
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

  filterDateRange = () => {};

  // Filter transfer based on the selected filters
  getFilteredTransfers({ tokens, transactions, selectedToken, selectedTransferType }) {
    return transactions.filter(
      ({ token, isIncoming }) => selectedToken === 0 || addressesEqual(token, tokens[selectedToken - 1].address)
    );
  }
  render() {
    const { displayedTransfers, selectedToken, selectedTransferType, startDate, endDate } = this.state;

    const { transactions } = this.props;

    const tokens = [{ symbol: "ETH", decimals: 5, address: "0x00be01CAF657Ff277269f169bd5220A390f791f7" }];

    const filteredTransfers = this.getFilteredTransfers({
      tokens,
      transactions,
      selectedToken,
      selectedTransferType
    });
    const symbols = tokens.map(({ symbol }) => symbol);

    const filtersActive = selectedToken !== 0 || selectedTransferType !== 0;

    return (
      <SpacedBlock>
        <section>
          {this.props.noHeader ? (
            <div />
          ) : (
            <Header>
              <Title>Employees</Title>
              <div>
                <label>
                  <Label>STATUS:</Label>
                  <DropDown items={["All", ...symbols]} active={selectedToken} onChange={this.handleTokenChange} />
                </label>
                <label>
                  <Label>ROLE TYPE:</Label>
                  <DropDown items={["All", ...symbols]} active={selectedToken} onChange={this.handleTokenChange} />
                </label>
              </div>
            </Header>
          )}
          {filteredTransfers.length === 0 ? (
            <NoTransfers>
              <p>
                No transfers found.{" "}
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
                    <DateHeader title="NAME" />
                    <StatusHeader title="START DATE" />
                    <SourceRecipientHeader title="END DATE" />
                    <AmountHeader title="ROLE" />
                    <AmountHeader title="SALARY" align="right" />
                    <AmountHeader title="TOTAL PAID THIS YEAR" align="right" />
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
                    <EmployeeItem
                      handleEmployeeDetailsChange={this.props.handleEmployeeDetailsChange}
                      key={transfer.tx}
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
      </SpacedBlock>
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

const DateHeader = styled(TableHeader)``;
const SourceRecipientHeader = styled(TableHeader)``;
const AmountHeader = styled(TableHeader)``;

const StatusHeader = styled(TableHeader)``;

const Footer = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 30px;
`;

const SpacedBlock = styled.div`
  margin-top: 30px;
  &:first-child {
    margin-top: 0;
  }
`;

export default EmployeeList;
