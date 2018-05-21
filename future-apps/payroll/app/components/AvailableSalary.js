import React from 'react';
import styled from 'styled-components';
import { Text, theme, Button, Countdown } from '@aragon/ui';
import { sciNot } from '../math-utils';

class AvaliableSalary extends React.Component {
  render() {
    return (
      <AvaliableSalaryTitleGrid>
        <HeaderCell style={{ marginLeft: '20px' }}>
          <Text size="xsmall" color={theme.textSecondary}>
            TIME SINCE LAST SALARY
          </Text>
        </HeaderCell>
        <HeaderCell>
          <Text size="xsmall" color={theme.textSecondary}>
            AVALIABLE BALANCE
          </Text>
        </HeaderCell>
        <HeaderCell>
          <Text size="xsmall" color={theme.textSecondary}>
            TOTAL TRANSFERED
          </Text>
        </HeaderCell>
        <HeaderCell>
          <Text size="xsmall" color={theme.textSecondary}>
            YOUR YEARLY SALARY
          </Text>
        </HeaderCell>

        <WhiteCell border="1px 0px 1px 1px" style={{ paddingLeft: '22px', paddingTop: '27px', minWidth: '200px' }}>
          <CountdownWStyle end={this.props.endDate} />
        </WhiteCell>
        <WhiteCell border="1px 0px 1px 0px">
          <Text size="xxlarge" color="#21D48E">
            {`+$${this.props.avaliableBalance}`}
          </Text>
        </WhiteCell>
        <WhiteCell border="1px 0px 1px 0px">
          <Text size="xxlarge">{`$${this.props.totalTransfered}`}</Text>
        </WhiteCell>
        <WhiteCell border="1px 1px 1px 0px">
          <Text size="xxlarge">{`$${this.props.yrSalary}`}</Text>
        </WhiteCell>
      </AvaliableSalaryTitleGrid>
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

const CountdownWStyle = styled(Countdown)`
  display: flex;
  margin-top: 10px;
`;

export default AvaliableSalary;
