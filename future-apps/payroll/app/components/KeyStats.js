import React from "react";
import styled from "styled-components";
import { Text, theme, Button, DropDown } from "@aragon/ui";
import { sciNot } from "../math-utils";

// Number of digits before "Total Supply" gets wrapped into two lines
const TOTAL_SUPPLY_CUTOFF_LENGTH = 18;
const DISTRIBUTION_ITEMS_MAX = 7;
const DISTRIBUTION_COLORS = ["#000000", "#57666F", "#028CD1", "#21AAE7", "#39CAD0", "#ADE9EC", "#80AEDC"];

const showTokenDistro = (accounts, total) => {
  const stakes = accounts.map(({ name, balance }) => ({
    name: name,
    stake: Math.floor((balance / total) * 100)
  }));

  stakes.push({
    name: "WOW",
    stake: Math.floor(((total - accounts.reduce((total, { balance }) => total + balance, 0)) / total) * 100)
  });

  return stakes;
};

class SideChart extends React.Component {
  static defaultProps = {
    holders: []
  };

  state = {
    selectedToken: 0
  };

  handleTokenChange = index => {
    this.setState({ selectedToken: index, displayedTransfers: 10 });
  };

  render() {
    const { holders, tokenDecimalsBase, tokenSupply } = this.props;
    const stakes = showTokenDistro(holders, tokenSupply).map((stake, i) => ({
      ...stake,
      color: DISTRIBUTION_COLORS[i] || "#000000"
    }));

    const adjustedTokenSupply = sciNot(tokenSupply / tokenDecimalsBase, TOTAL_SUPPLY_CUTOFF_LENGTH, { rounding: 5 });

    return (
      <Main>
        <Part>
          <h1>
            <Text color={theme.textSecondary} smallcaps>
              Key stats
            </Text>
          </h1>

          <KeyGrid>
            <Text size="large" weight="bold">
              Paid salaries
            </Text>

            <DropDown
              items={["Monthly", "Daily"]}
              active={this.state.selectedToken}
              onChange={this.handleTokenChange}
            />

            
            <TitleSpanTwo >Salary burn rate</TitleSpanTwo>

            <Text color={theme.textSecondary}>Salary paid this year</Text>
            <MoneyStyle weight="bold">$119,989.88</MoneyStyle>
            <Text color={theme.textSecondary}>Remaining salary this year</Text>
            <MoneyStyle weight="bold">$600,000.00</MoneyStyle>

            <LineBreak />

            <Text color={theme.textSecondary}>Total year salary bill</Text>
            <MoneyStyle weight="bold">$719,939.28</MoneyStyle>
            <Text color={theme.textSecondary}>Cash reserves</Text>
            <MoneyStyle weight="bold" color={theme.positive}>
              $103,204,230.23
            </MoneyStyle>
          </KeyGrid>
        </Part>
      </Main>
    );
  }
}

const MoneyStyle = styled(Text)`
  text-align: right;
`;

const TitleSpanTwo = styled.div`
  grid-column: 1/3;
  margin-bottom: 5px;
  font-weight:bold;
`;

const LineBreak = styled.div`
  grid-column: 1/3;
  border-bottom: 0.5px solid #D1D1D1;
  height: 1px;
`;

const KeyGrid = styled.div`
  display: grid;
  grid-template-columns: auto auto;
  grid-gap: 13px;
  align-items: center;
`;

const Main = styled.aside`
  flex-shrink: 0;
  flex-grow: 0;
  width: 310px;
  margin-left: 30px;
  min-height: 100%;
`;

const Part = styled.div`
  margin-bottom: 55px;
  h1 {
    margin-bottom: 15px;
    color: ${theme.textSecondary};
    text-transform: lowercase;
    line-height: 30px;
    font-variant: small-caps;
    font-weight: 600;
    font-size: 16px;
    border-bottom: 1px solid ${theme.contentBorder};
  }
`;

const InfoRow = styled.li`
  display: flex;
  justify-content: space-between;
  margin-bottom: 15px;
  list-style: none;

  > span:nth-child(1) {
    font-weight: 400;
    color: ${theme.textSecondary};
  }
  > span:nth-child(2) {
    display: none;
  }
  strong {
    text-transform: uppercase;
  }
`;

const StakesBar = styled.div`
  display: flex;
  width: 100%;
  overflow: hidden;
  margin: 10px 0 30px;
  border-radius: 3px;
`;

const StakesListItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 10px;
  list-style: none;

  > span:first-child {
    display: flex;
    align-items: center;
    max-width: 80%;
  }
`;

const StakesListBullet = styled.span`
  width: 10px;
  height: 10px;
  margin-right: 15px;
  border-radius: 5px;
  flex-shrink: 0;
  & + span {
    flex-shrink: 1;
    text-overflow: ellipsis;
    overflow: hidden;
  }
`;

const ButtonHolder = styled.div`
  display: flex;
  align-items: end;
  margin-top: 20px;
  justify-content: flex-end;
`;

export default SideChart;
