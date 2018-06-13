import React from "react";
import styled from "styled-components";
import { Text, theme, Button, Info } from "@aragon/ui";
import { sciNot } from "../math-utils";

// Number of digits before "Total Supply" gets wrapped into two lines
const TOTAL_SUPPLY_CUTOFF_LENGTH = 18;
const DISTRIBUTION_ITEMS_MAX = 7;
const DISTRIBUTION_COLORS = ["#000000", "#57666F", "#028CD1", "#21AAE7", "#39CAD0", "#ADE9EC", "#80AEDC"];

const showTokenDistro = (accounts, total) => {
  const stakes = accounts.map(({ name, balance, price }) => ({
    name: name,
    price: price,
    balance: balance,
    stake: Math.floor((balance / total) * 100)
  }));

  stakes.push({
    name: "WOW",
    stake: Math.floor(((total - accounts.reduce((total, { balance }) => total + balance, 0)) / total) * 100),
    price: 43.92,
    balance: 100.01
  });

  return stakes;
};

class SalaryAllocationInner extends React.Component {
  static defaultProps = {
    holders: []
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
          <Text size="large" weight="bold">
            Salary allocation
          </Text>
          <StakesBar>
            {stakes.map(({ name, stake, color }) => (
              <div
                key={name}
                title={`${name}: ${stake}%`}
                style={{
                  width: `${stake}%`,
                  height: "10px",
                  background: color
                }}
              />
            ))}
          </StakesBar>
          <ul>
            {stakes.map(({ name, stake, color, balance, price }) => (
              <StakesListItem key={name}>
                <span>
                  <StakesListBullet style={{ background: color }} />
                  <Text title={name} color={theme.textSecondary}>
                    {name}
                  </Text>
                </span>
                <span>
                  {balance} {name}
                </span>
                <span>${price}</span>
                <strong>{stake}%</strong>
              </StakesListItem>
            ))}
          </ul>

          <BreakGrid>
            <div style={{ fontWeight: 600 }}>Total salary</div>
            <div />
            <div style={{ fontWeight: 600, textAlign: "center" }}>$23,424.32 </div>
            <div style={{ fontWeight: 600, textAlign: "right" }}>100%</div>
          </BreakGrid>
          <ButtonHolder>
            <Button onClick={this.props.handleSidePanelChange} mode="text">
              Edit salary allocation
            </Button>
          </ButtonHolder>
        </Part>
      </Main>
    );
  }
}

const BreakGrid = styled.aside`
  margin-top: 20px;
  display: grid;
  grid-template-columns: 100px 100px 150px 42px;
`;

const Main = styled.aside`
  flex-shrink: 0;
  flex-grow: 0;
  margin-left: 0px;
  margin-right: 0px;
  min-height: 100%;
`;

const Part = styled.div`
  margin-bottom: 40px;
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

export default SalaryAllocationInner;
