import React from "react";
import styled from "styled-components";
import { Text, theme } from "@aragon/ui";
import { LineChart, Line, XAxis, Tooltip } from "recharts";

class SideChart extends React.Component {
  state = {
    selectedToken: 0
  };

  render() {
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

            <SpanTwo>
              <LineChart
                width={300}
                height={150}
                data={this.props.paidSalaries}
                margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
              >
                <XAxis dataKey="name" tickCount={12} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="cost"
                  stroke="#4DAEDE"
                  activeDot={{ stroke: "white", strokeWidth: 2, r: 4 }}
                />
              </LineChart>
            </SpanTwo>

            <Text color={theme.textSecondary}>Salary paid this year</Text>
            <MoneyStyle weight="bold">$119,989.88</MoneyStyle>

            <TitleSpanTwo>Salary burn rate</TitleSpanTwo>

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

const SpanTwo = styled.div`
  grid-column: 1/3;
`;

const TitleSpanTwo = styled.div`
  grid-column: 1/3;
  margin-bottom: 5px;
  font-weight: bold;
`;

const LineBreak = styled.div`
  grid-column: 1/3;
  border-bottom: 0.5px solid #d1d1d1;
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

export default SideChart;
