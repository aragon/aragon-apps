import React from "react";
import styled from "styled-components";
import { Text, theme, Button, Countdown } from "@aragon/ui";
import { formatTokenAmount } from "../../lib/utils";

class TotalPayroll extends React.Component {
  msToCountDown(timeInMs) {
    return new Date(Date.now() - timeInMs);
  }

  splitAmount = amount => {
    const [integer, fractional] = formatTokenAmount(amount).split(".");
    return (
      <span>
        <span className="integer">{integer}</span>
        {fractional && <span className="fractional">.{fractional}</span>}
      </span>
    );
  };

  render() {
    const { numberOfEmployees, avgSalary, monthlyBurnRate, totalPaidYr } = this.props;    
    return (
      <div>
        <Text size="large">Total payroll</Text>
        <AvaliableSalaryTitleGrid>
          <HeaderCell style={{ marginLeft: "20px" }}>
            <Text size="xsmall" color={theme.textSecondary}>
              EMPLOYEES
            </Text>
          </HeaderCell>
          <HeaderCell>
            <Text size="xsmall" color={theme.textSecondary}>
              AVERAGE SALARY
            </Text>
          </HeaderCell>
          <HeaderCell>
            <Text size="xsmall" color={theme.textSecondary}>
              MONTHLY BURN RATE
            </Text>
          </HeaderCell>
          <HeaderCell>
            <Text size="xsmall" color={theme.textSecondary}>
              TOTAL PAID THIS YEAR
            </Text>
          </HeaderCell>

          <WhiteCell border="1px 0px 1px 1px" style={{ paddingLeft: "22px" }}>
            <Text size="xxlarge">
              <Amount>{numberOfEmployees}</Amount>
            </Text>
          </WhiteCell>
          <WhiteCell border="1px 0px 1px 0px">
            <Text size="xxlarge">
              <Amount>${this.splitAmount(avgSalary.toFixed(2))}</Amount>
            </Text>
          </WhiteCell>
          <WhiteCell border="1px 0px 1px 0px">
            <Text size="xxlarge" color={theme.negative}>
              <Amount>${this.splitAmount(monthlyBurnRate.toFixed(2))}</Amount>
            </Text>
          </WhiteCell>
          <WhiteCell border="1px 1px 1px 0px">
            <Text size="xxlarge">
              <Amount>${this.splitAmount(totalPaidYr.toFixed(2))}</Amount>
            </Text>
          </WhiteCell>
        </AvaliableSalaryTitleGrid>
      </div>
    );
  }
}

const HeaderCell = styled.div`
  margin-bottom: 8px;
`;
const WhiteCell = styled.div`
  background-color: white;
  padding: 20px 0px 20px 0px;
  border: solid #e8e8e8 0px;
  border-width: ${props => props.border};
`;

const AvaliableSalaryTitleGrid = styled.div`
  margin-top: 15px;
  display: grid;
  grid-template-columns: auto auto auto auto;
  grid-template-rows: auto;
`;

const Amount = styled.div`
  font-size: 26px;
  .fractional {
    font-size: 14px;
  }
`;

export default TotalPayroll;
